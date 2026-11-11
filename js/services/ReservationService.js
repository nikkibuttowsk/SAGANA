class ReservationService {
    static async createReservation(reservationInstance) {
        reservationInstance.validate();
        const { data, error } = await supabase
            .from('reservations')
            .insert([reservationInstance.toPayload()])
            .select();

        if (error) throw new Error(error.message);
        return new ReservationModel(data[0]);
    }
}