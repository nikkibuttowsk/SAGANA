class ReservationService {
    static async createReservation(reservation) {
        reservation.validate();
        const { data: existingReservation } = await db
            .from('reservations')
            .select('*')
            .eq('idempotency_key', reservation.idempotencyKey)
            .maybeSingle();

        if (existingReservation) return new ReservationModel(existingReservation);

        const { error } = await db
            .from('reservations')
            .insert([reservationInstance.toPayload()])
            .select();

        if (error) {
            console.error("ReservationServive createReservation error:", error);
            throw new Error("We couldn't save your reservation. Please try again.");
        }
        
        return new ReservationModel(data[0]);
    }
}