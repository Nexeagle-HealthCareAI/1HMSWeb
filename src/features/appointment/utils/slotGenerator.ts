import { ShiftDayDetail } from '../services/appointmentApi';

export interface GeneratedTimeSlot {
  id: string;
  time: string;
  shiftName: string;
  isBooked: boolean;
  patientInfo?: {
    name: string;
    phone: string;
    age: number;
    gender: string;
  };
  doctorId: string;
  date: string;
}

export const generateTimeSlotsFromShiftInfo = (
  shiftDayDetails: ShiftDayDetail[],
  doctorId: string,
  date: string
): GeneratedTimeSlot[] => {
  const slots: GeneratedTimeSlot[] = [];

  shiftDayDetails.forEach((shift) => {
    const { startTime, endTime, slotDurationInMinutes, shiftName } = shift;
    
    // Parse start and end times
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // Generate slots based on duration
    let currentTime = new Date(start);
    
    while (currentTime < end) {
      const timeString = currentTime.toTimeString().slice(0, 5); // HH:MM format
      const slotId = `${doctorId}-${date}-${timeString}`;
      
      slots.push({
        id: slotId,
        time: timeString,
        shiftName,
        isBooked: false, // All slots are available by default
        doctorId,
        date
      });
      
      // Move to next slot
      currentTime.setMinutes(currentTime.getMinutes() + slotDurationInMinutes);
    }
  });

  return slots;
};
