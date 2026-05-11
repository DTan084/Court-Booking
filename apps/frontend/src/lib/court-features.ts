import { CourtType, FacilityFeature } from '@court-booking/shared';

export const COURT_TYPE_LABELS: Record<CourtType, { label: string; color: string }> = {
  [CourtType.INDOOR]: { label: 'Trong nhà', color: 'blue' },
  [CourtType.OUTDOOR]: { label: 'Ngoài trời', color: 'green' },
};

export const FACILITY_FEATURE_LABELS: Record<FacilityFeature, { label: string; icon: string }> = {
  [FacilityFeature.PARKING]: { label: 'Bãi đỗ xe', icon: '🅿️' },
  [FacilityFeature.LOCKER_ROOM]: { label: 'Phòng thay đồ', icon: '🛅' },
  [FacilityFeature.SHOWER]: { label: 'Phòng tắm', icon: '🚿' },
  [FacilityFeature.LIGHTING]: { label: 'Hệ thống đèn', icon: '💡' },
  [FacilityFeature.AIR_CONDITIONING]: { label: 'Máy lạnh', icon: '❄️' },
  [FacilityFeature.WIFI]: { label: 'WiFi', icon: '📶' },
  [FacilityFeature.CAFETERIA]: { label: 'Căn tin', icon: '☕' },
  [FacilityFeature.EQUIPMENT_RENTAL]: { label: 'Thuê thiết bị', icon: '🏸' },
  [FacilityFeature.FIRST_AID]: { label: 'Sơ cứu', icon: '🚑' },
  [FacilityFeature.WHEELCHAIR_ACCESSIBLE]: { label: 'Lối đi xe lăn', icon: '♿' },
};
