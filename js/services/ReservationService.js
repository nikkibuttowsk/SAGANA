class ReservationService {
    static async createReservation(reservation) {
        reservation.validate();

        const { data, error } = await db
            .from('reservations')
            .insert([reservation.toPayload()])
            .select();

        if (error) {
            console.error("ReservationService createReservation error:", error);
            throw new Error("We couldn't save your reservation. Please try again.");
        }

        const savedData = data[0];

        try {
            const { error: fnError } = await db.functions.invoke("send-reservation-email", {
                body: {
                    record: {
                        id: savedData.id,
                        idempotency_key: reservation.idempotencyKey,
                        visitor_name: reservation.visitorName,
                        visitor_email: reservation.visitorEmail,
                        visitor_phone: reservation.visitorPhone,
                        visit_date: reservation.visitDate,
                        time_slot: reservation.timeSlot,
                        guest_count: reservation.guestCount,
                        farm_id: reservation.farmId
                    }
                }
            });

            if (fnError) {
                console.warn("Edge function invocation failed:", fnError.message);
            } 
        } catch (emailErr){
                console.error("Failed to send email:", emailErr);
            }
        
        return new ReservationModel(savedData);
    }
}