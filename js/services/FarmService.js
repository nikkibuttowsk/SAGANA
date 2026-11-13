class FarmService {
    static async getAllFarms() {
        const response = await fetch(`${API_URL}?action=farms`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "We couldn't load the farms.");
        return (result.data || []).map(row => new FarmModel(row));
    }

    static async getFarmById(id) {
        if (!id) return null;
        const response = await fetch(`${API_URL}?action=farm&id=${encodeURIComponent(id)}`);
        const result = await response.json();
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(result.error || "We couldn't load this farm.");
        return new FarmModel(result.data);
    }

    static async registerFarm(farm, website = "") {
        const payload = {
            name: farm.name,
            province: farm.province,
            location: farm.location,
            admin_email: farm.adminEmail,
            entrance_fee: farm.entranceFee,
            crops: farm.crops,
            season: farm.season,
            category: farm.category,
            bearing_season: farm.bearingSeason,
            hours: farm.hours,
            description: farm.description,
            latitude: farm.latitude,
            longitude: farm.longitude,
            images: farm.images
        };

        const response = await fetch(`${API_URL}?action=farm-submission`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, website })
        });
        const result = await response.json();
        if (!response.ok) {
            console.error("FarmService registerFarm error:", result.error);
            throw new Error("We couldn't submit your farm. Please try again.");
        }
        return result;
    }
}