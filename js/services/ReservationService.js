class ReservationService {
    static async createReservation(reservation) {
        reservation.validate();

        const response = await fetch(`${API_URL}?action=reservation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reservation.toPayload())
        });
        const result = await response.json();
        if (!response.ok) {
            console.error("ReservationService createReservation error:", result.error);
            throw new Error("We couldn't save your reservation. Please try again.");
        }

        return new ReservationModel(result.data);
    }
}