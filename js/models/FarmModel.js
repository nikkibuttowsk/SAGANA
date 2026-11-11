class FarmModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || 'Unnamed Farm';
        this.location = data.location || data.province || 'Philippines';
        this.province = data.province || '';
        this.category = data.category || 'popular';
        this.season = data.season || 'all';
        this.crops = Array.isArray(data.crops) ? data.crops : (data.crops ? [data.crops] : []);
        this.bearingSeason = data.bearing_season || 'All Season';
        this.entranceFee = data.entrance_fee ? Number(data.entrance_fee) : 0;
        this.hours = data.hours || '8:00 AM - 5:00 PM';
        this.description = data.description || 'Welcome to our fruit farm experience!';
        this.headline = data.headline || null;
        this.newsSummary = data.news_summary || null;
        this.isTrending = Boolean(data.is_trending);
        this.images = Array.isArray(data.images) && data.images.length > 0 ? data.images : ['images/default-farm.jpg'];
        this.latitude = data.latitude ? Number(data.latitude) : null;
        this.longitude = data.longitude ? Number(data.longitude) : null;
        this.adminEmail = data.admin_email || 'admin@sagana.ph';
    }

    getFormattedFee() {
        return this.entranceFee > 0 ? `₱${this.entranceFee.toFixed(2)} / Person` : 'Free Admission';
    }

    getFormattedCrops() {
        return this.crops.length > 0 ? this.crops.join(', ') : 'Fresh Produce';
    }

    getCoverPhoto() {
        return this.images[0];
    }
}