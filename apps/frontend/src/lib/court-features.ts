import { CourtType, FacilityFeature } from '@court-booking/shared';

export const COURT_TYPE_LABELS: Record<CourtType, { label: string; color: string }> = {
  [CourtType.INDOOR]: { label: 'Trong nhà', color: 'blue' },
  [CourtType.OUTDOOR]: { label: 'Ngoài trời', color: 'green' },
};

export const FACILITY_FEATURE_LABELS: Record<FacilityFeature, { label: string; icon: string }> = {
  [FacilityFeature.PARKING]: { label: 'Bãi đỗ xe', icon: 'P' },
  [FacilityFeature.LOCKER_ROOM]: { label: 'Phòng thay đồ', icon: 'L' },
  [FacilityFeature.SHOWER]: { label: 'Phòng tắm', icon: 'S' },
  [FacilityFeature.LIGHTING]: { label: 'Đèn chiếu sáng', icon: 'D' },
  [FacilityFeature.AIR_CONDITIONING]: { label: 'Điều hòa', icon: 'A' },
  [FacilityFeature.WIFI]: { label: 'WiFi', icon: 'W' },
  [FacilityFeature.CAFETERIA]: { label: 'Căng-tin', icon: 'C' },
  [FacilityFeature.EQUIPMENT_RENTAL]: { label: 'Cho thuê dụng cụ', icon: 'E' },
  [FacilityFeature.FIRST_AID]: { label: 'Sơ cứu', icon: 'F' },
  [FacilityFeature.WHEELCHAIR_ACCESSIBLE]: { label: 'Tiếp cận xe lăn', icon: 'R' },
};
