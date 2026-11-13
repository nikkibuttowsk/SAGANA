class ReservationModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.farmId = data.farm_id || null;
        this.visitorName = data.visitor_name || '';
        this.visitorEmail = data.visitor_email || '';
        this.visitorPhone = data.visitor_phone || '';
        this.visitDate = data.visit_date || '';
        this.timeSlot = data.time_slot || '';
        this.guestCount = Number.parseInt(data.guest_count, 10) || 1;
        // idempotency key
        this.idempotencyKey = data.idempotency_key || ReservationModel.newKey();
    }

    static newKey () {
        return crypto.randomUUID?.() ?? `res_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    validate() {
        if (!this.farmId) throw new Error("Please choose a farm.");
        if (!this.visitorName.trim()) throw new Error("Visitor name is required.");
        if (!this.visitorEmail.trim() || !this.visitorEmail.includes('@')) throw new Error("Valid email is required.");
        if (!this.visitorPhone.trim()) throw new Error("Mobile number is required.");
        if (!this.visitDate) throw new Error("Visit date is required.");
        if (!this.timeSlot) throw new Error("Time slot is required.");
        if (this.guestCount < 1) throw new Error("At least one guest is required.");
        return true;
    }

    toPayload() {
        return {
            farm_id: this.farmId,
            visitor_name: this.visitorName,
            visitor_email: this.visitorEmail,
            visitor_phone: this.visitorPhone,
            visit_date: this.visitDate,
            time_slot: this.timeSlot,
            guest_count: this.guestCount,
            idempotency_key: this.idempotencyKey
        };
    }
}