import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlotTemplateEntity } from '../../database/entities/slot-template.entity';
import { SlotTemplateItemEntity } from '../../database/entities/slot-template-item.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { CourtEntity } from '../../database/entities/court.entity';

type TemplateItemInput = {
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  price: number;
};

@Injectable()
export class SlotTemplatesService {
  constructor(
    @InjectRepository(SlotTemplateEntity)
    private readonly templateRepo: Repository<SlotTemplateEntity>,
    @InjectRepository(SlotTemplateItemEntity)
    private readonly itemRepo: Repository<SlotTemplateItemEntity>,
    @InjectRepository(CourtTimeSlotEntity)
    private readonly courtSlotRepo: Repository<CourtTimeSlotEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepo: Repository<CourtEntity>,
  ) {}

  private hourPart(time: string) {
    return Number(time.split(':')[0]);
  }

  private validateItems(items: TemplateItemInput[]) {
    for (const item of items) {
      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new BadRequestException('Ngày trong tuần phải từ 0 (Chủ nhật) đến 6 (Thứ 7)');
      }
      if (item.endHour <= item.startHour) {
        throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
      }
    }
  }

  async list() {
    const templates = await this.templateRepo.find({ order: { createdAt: 'DESC' } });
    const items = await this.itemRepo.find();
    const slots = await this.courtSlotRepo.find();
    return templates.map((template) => ({
      ...template,
      itemCount: items.filter((item) => item.templateId === template.id).length,
      courtCount: new Set(
        slots.filter((slot) => slot.templateId === template.id).map((slot) => slot.courtId),
      ).size,
    }));
  }

  async detail(id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Slot template not found');
    const items = await this.itemRepo.find({
      where: { templateId: id },
      order: { dayOfWeek: 'ASC', startHour: 'ASC' },
    });
    return { ...template, items };
  }

  async create(payload: { name: string; description?: string; items?: TemplateItemInput[] }) {
    const items = payload.items ?? [];
    this.validateItems(items);
    const template = await this.templateRepo.save(
      this.templateRepo.create({
        name: payload.name,
        description: payload.description ?? null,
      }),
    );
    if (items.length > 0) {
      await this.itemRepo.save(
        items.map((item) => this.itemRepo.create({ ...item, templateId: template.id })),
      );
    }
    return this.detail(template.id);
  }

  async update(
    id: string,
    payload: { name?: string; description?: string | null; isActive?: boolean },
  ) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Slot template not found');
    Object.assign(template, payload);
    await this.templateRepo.save(template);
    return this.detail(id);
  }

  async replaceItems(id: string, items: TemplateItemInput[]) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Slot template not found');
    this.validateItems(items);
    await this.itemRepo.delete({ templateId: id });
    if (items.length > 0) {
      await this.itemRepo.save(
        items.map((item) => this.itemRepo.create({ ...item, templateId: id })),
      );
    }
    return this.detail(id);
  }

  async remove(id: string) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Slot template not found');
    await this.templateRepo.remove(template);
    return { id };
  }

  async applyTemplate(
    courtId: string,
    templateId: string,
    dateRange?: { fromDate?: string; toDate?: string },
  ) {
    const court = await this.courtRepo.findOne({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');

    const template = await this.templateRepo.findOne({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Slot template not found');

    const items = await this.itemRepo.find({ where: { templateId } });
    if (items.length === 0) return { inserted: 0, skipped: 0 };

    const startDate = dateRange?.fromDate ? new Date(`${dateRange.fromDate}T00:00:00`) : new Date();
    const endDate = dateRange?.toDate
      ? new Date(`${dateRange.toDate}T23:59:59`)
      : new Date(startDate.getTime() + 27 * 24 * 60 * 60 * 1000);
    if (endDate < startDate)
      throw new BadRequestException('to_date phải lớn hơn hoặc bằng from_date');

    const existing = await this.courtSlotRepo.find({ where: { courtId } });
    const existingSet = new Set(existing.map((s) => `${s.dayOfWeek}-${s.startHour}-${s.endHour}`));

    let inserted = 0;
    let skipped = 0;

    const newSlots: CourtTimeSlotEntity[] = [];
    const daySeen = new Set<number>();
    for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
      daySeen.add(day.getDay());
    }

    for (const item of items) {
      if (!daySeen.has(item.dayOfWeek)) continue;
      const startHour = this.hourPart(item.startHour);
      const endHour = this.hourPart(item.endHour);
      const key = `${item.dayOfWeek}-${startHour}-${endHour}`;
      if (existingSet.has(key)) {
        skipped += 1;
        continue;
      }
      existingSet.add(key);
      newSlots.push(
        this.courtSlotRepo.create({
          courtId,
          dayOfWeek: item.dayOfWeek,
          startHour,
          endHour,
          price: item.price,
          templateId,
        }),
      );
      inserted += 1;
    }

    if (newSlots.length > 0) {
      await this.courtSlotRepo.save(newSlots);
    }

    return { inserted, skipped };
  }
}
