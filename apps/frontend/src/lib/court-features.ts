import { CourtType, FacilityFeature } from '@court-booking/shared';

export const COURT_TYPE_LABELS: Record<CourtType, { label: string; color: string }> = {
  [CourtType.INDOOR]: { label: 'Trong nhà', color: 'blue' },
  [CourtType.OUTDOOR]: { label: 'Ngoài trời', color: 'green' },
};

export const FACILITY_FEATURE_LABELS: Record<FacilityFeature, { label: string; icon: string }> = {
  [FacilityFeature.PARKING]: { label: 'Bãi đỗ xe', icon: '🅿️' },
  [FacilityFeature.LOCKER_ROOM]: { label: 'Phòng thay đồ', icon: '🚪' },
  [FacilityFeature.SHOWER]: { label: 'Phòng tắm', icon: '🚿' },
  [FacilityFeature.LIGHTING]: { label: 'Đèn chiếu sáng', icon: '💡' },
  [FacilityFeature.AIR_CONDITIONING]: { label: 'Điều hòa', icon: '❄️' },
  [FacilityFeature.WIFI]: { label: 'WiFi', icon: '📶' },
  [FacilityFeature.CAFETERIA]: { label: 'Căng-tin', icon: '☕' },
  [FacilityFeature.EQUIPMENT_RENTAL]: { label: 'Cho thuê dụng cụ', icon: '🏸' },
  [FacilityFeature.FIRST_AID]: { label: 'Sơ cứu', icon: '🏥' },
  [FacilityFeature.WHEELCHAIR_ACCESSIBLE]: { label: 'Tiếp cận xe lăn', icon: '♿' },
};
