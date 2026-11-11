class ReservationService {
    static async createReservation(reservation) {
        reservation.validate();

        const { error } = await db
            .from('reservations')
            .insert([reservation.toPayload()]);

        if (error) {
            console.error("ReservationServive createReservation error:", error);
            throw new Error("We couldn't save your reservation. Please try again.");
        }
        
        return reservation;
    }
}