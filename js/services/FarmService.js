class FarmService {
    static async getAllFarms() {
        const { data, error } = await supabase.from('farms').select('*');
        if (error) throw new Error(error.message);
        return (data || []).map(row => new FarmModel(row));
    }

    static async getFarmById(id) {
        if (!id) return null;
        const { data, error } = await supabase.from('farms').select('*').eq('id', id).single();
        if (error) return null;
        return new FarmModel(data);
    }

    static async registerFarm(farmInstance) {
        const payload = {
            name: farmInstance.name,
            province: farmInstance.province,
            location: farmInstance.location,
            admin_email: farmInstance.adminEmail,
            entrance_fee: farmInstance.entranceFee,
            crops: farmInstance.crops,
            season: farmInstance.season,
            category: farmInstance.category,
            bearing_season: farmInstance.bearingSeason,
            hours: farmInstance.hours,
            description: farmInstance.description,
            latitude: farmInstance.latitude,
            longitude: farmInstance.longitude,
            images: farmInstance.images
        };

        const { data, error } = await supabase.from('farms').insert([payload]).select();
        if (error) throw new Error(error.message);
        return new FarmModel(data[0]);
    }
}