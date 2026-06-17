// components/weather/weather.js
Component({
  properties: {
    weather: {
      type: String,
      value: ''
    },
    loading: {
      type: Boolean,
      value: false
    }
  },

  data: {},

  methods: {
    // 刷新天气
    refreshWeather() {
      this.triggerEvent('refresh');
    }
  }
});
