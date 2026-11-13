const FARMS_SOURCE = "farms_public";

class FarmService {
    static async getAllFarms() {
        const { data, error } = await db.from(FARMS_SOURCE).select('*');
        if (error) throw new Error(error.message);
        return (data || []).map(row => new FarmModel(row));
    }

    static async getFarmById(id) {
        if (!id) return null;
        const { data, error } = await db.from(FARMS_SOURCE).select('*').eq('id', id).single();
        if (error) return null;
        return new FarmModel(data);
    }

    static async registerFarm(farm) {
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

        const { data, error } = await db.from(FARMS_SOURCE).insert([payload]).select();
        if (error) throw new Error(error.message);
        return new FarmModel(data[0]);
    }
}