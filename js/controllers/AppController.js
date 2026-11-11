class AppController {
    static async fetchHomePageData() {
        const farms = await FarmService.getAllFarms();
        const trending = farms.filter(f => f.isTrending || f.headline);
        const popular = farms.filter(f => f.category === 'popular');

        return {
            allFarms: farms,
            trendingNews: trending.length > 0 ? trending : farms.slice(0, 3),
            popularFarms: popular.length > 0 ? popular : farms.slice(0, 3)
        };
    }

    static async submitReservation(formData) {
        const reservation = new ReservationModel(formData);
        return await ReservationService.createReservation(reservation);
    }

    static async registerNewFarm(formData) {
        const farm = new FarmModel(formData);
        return await FarmService.registerFarm(farm);
    }
}