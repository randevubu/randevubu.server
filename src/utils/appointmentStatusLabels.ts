import { AppointmentStatus } from '../types/business';

/** Turkish labels for customer-facing appointment lists (matches common filter copy). */
const STATUS_LABEL_TR: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'Beklemede',
  [AppointmentStatus.CONFIRMED]: 'Onaylandı',
  [AppointmentStatus.IN_PROGRESS]: 'Devam ediyor',
  [AppointmentStatus.COMPLETED]: 'Tamamlandı',
  [AppointmentStatus.CANCELED]: 'İptal Edildi',
  [AppointmentStatus.NO_SHOW]: 'Gelmedi'
};

export function getAppointmentStatusLabelTr(status: AppointmentStatus | string): string {
  if (status in STATUS_LABEL_TR) {
    return STATUS_LABEL_TR[status as AppointmentStatus];
  }
  return String(status);
}
