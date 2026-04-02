import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_ARCGIS_API_KEY;

async function run() {
  try {
    const { data } = await axios.get('https://places-api.arcgis.com/arcgis/rest/services/Places/places/queryplacesnearpoint', {
      params: {
        f: 'json',
        token: API_KEY,
        radius: 5000,
        searchText: 'Gas Station',
        pageSize: 1,
        x: -84.38798,
        y: 33.74899
      }
    });
    console.log("Response:", data);
  } catch(e) {
    console.error("Error:", e.response?.data || e.message);
  }
}
run();
