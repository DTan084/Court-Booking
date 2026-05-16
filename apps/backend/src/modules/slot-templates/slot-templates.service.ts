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

type ApplyOption = 'SKIP_CONFLICTS' | 'OVERWRITE_CONFLICTS';
type ApplyPayload = {
  confirmed?: boolean;
  option?: ApplyOption;
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

  private parseHour(time: string) {
    const parts = time.split(':');
    if (parts.length < 2) throw new BadRequestException(`Invalid time format: ${time}`);

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new BadRequestException(`Invalid time value: ${time}`);
    }
    if (minute !== 0) {
      throw new BadRequestException('Only full-hour slots are supported (mm must be 00)');
    }
    return hour;
  }

  private validateItems(items: TemplateItemInput[]) {
    const byDay = new Map<number, Array<{ start: number; end: number }>>();

    for (const item of items) {
      if (item.dayOfWeek < 0 || item.dayOfWeek > 6) {
        throw new BadRequestException('dayOfWeek must be in range 0..6');
      }

      const startHour = this.parseHour(item.startHour);
      const endHour = this.parseHour(item.endHour);
      if (endHour <= startHour) {
        throw new BadRequestException('endHour must be greater than startHour');
      }

      const ranges = byDay.get(item.dayOfWeek) ?? [];
      for (const range of ranges) {
        if (startHour < range.end && endHour > range.start) {
          throw new BadRequestException('Template items overlap in the same day');
        }
      }
      ranges.push({ start: startHour, end: endHour });
      byDay.set(item.dayOfWeek, ranges);
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

  async applyTemplate(courtId: string, templateId: string, payload?: ApplyPayload) {
    const court = await this.courtRepo.findOne({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');

    const template = await this.templateRepo.findOne({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Slot template not found');

    const items = await this.itemRepo.find({ where: { templateId } });
    if (items.length === 0) {
      return payload?.confirmed
        ? { inserted: 0, skipped: 0, overwritten: 0 }
        : { toInsert: 0, toSkip: 0, conflicts: [], option: payload?.option ?? 'SKIP_CONFLICTS' };
    }

    const existing = await this.courtSlotRepo.find({ where: { courtId } });

    const option: ApplyOption = payload?.option ?? 'SKIP_CONFLICTS';
    const conflicts: Array<{
      dayOfWeek: number;
      startHour: string;
      endHour: string;
      existingPrice: number;
      templatePrice: number;
    }> = [];

    let toInsert = 0;
    let toSkip = 0;

    for (const item of items) {
      const startHour = this.parseHour(item.startHour);
      const endHour = this.parseHour(item.endHour);
      const overlappingSlots = existing.filter(
        (slot) =>
          slot.dayOfWeek === item.dayOfWeek && startHour < slot.endHour && endHour > slot.startHour,
      );
      const existingSlot = overlappingSlots[0];

      if (existingSlot) {
        toSkip += 1;
        conflicts.push({
          dayOfWeek: item.dayOfWeek,
          startHour: item.startHour,
          endHour: item.endHour,
          existingPrice: Number(existingSlot.price),
          templatePrice: Number(item.price),
        });
      } else {
        toInsert += 1;
      }
    }

    if (!payload?.confirmed) {
      return {
        toInsert,
        toSkip,
        conflicts,
        option,
      };
    }

    const newSlots: CourtTimeSlotEntity[] = [];
    const slotsToDeleteMap = new Map<string, CourtTimeSlotEntity>();
    let inserted = 0;
    let skipped = 0;
    let overwritten = 0;

    for (const item of items) {
      const startHour = this.parseHour(item.startHour);
      const endHour = this.parseHour(item.endHour);
      const overlappingSlots = existing.filter(
        (slot) =>
          slot.dayOfWeek === item.dayOfWeek && startHour < slot.endHour && endHour > slot.startHour,
      );
      const existingSlot = overlappingSlots[0];

      if (existingSlot) {
        if (option !== 'OVERWRITE_CONFLICTS') {
          skipped += 1;
          continue;
        }

        for (const slot of overlappingSlots) {
          slotsToDeleteMap.set(slot.id, slot);
        }
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
        overwritten += 1;
        continue;
      }

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

    if (slotsToDeleteMap.size > 0) {
      await this.courtSlotRepo.remove([...slotsToDeleteMap.values()]);
    }
    if (newSlots.length > 0) {
      await this.courtSlotRepo.save(newSlots);
    }

    return { inserted, skipped, overwritten };
  }
}
