class ReservationService {
    static async createReservation(reservationInstance) {
        reservationInstance.validate();
        const { data: existingReservation } = await supabase
            .from('reservations')
            .select('*')
            .eq('idempotency_key', reservationInstance.idempotencyKey)
            .maybeSingle();

        if (existingReservation) return new ReservationModel(existingReservation);

        const { data, error } = await supabase
            .from('reservations')
            .insert([reservationInstance.toPayload()])
            .select();

        if (error) {
            console.error("ReservationServive createReservation error:", error);
            throw new Error(error.message);
        }
        
        return new ReservationModel(data[0]);
    }
}