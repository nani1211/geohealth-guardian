/**
 * TEMPORARY: Frontend integration test for WHO ICD API.
 * DO NOT USE IN PRODUCTION due to exposure of ClientSecret.
 */

const clientId = import.meta.env.VITE_WHO_CLIENT_ID;
const clientSecret = import.meta.env.VITE_WHO_CLIENT_SECRET;
const baseUrl = import.meta.env.VITE_WHO_BASE_URL;

async function getWhoToken() {
  const response = await fetch(`${baseUrl}/connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  const data = await response.json();
  return data.access_token;
}

export async function fetchDiseaseData() {
  try {
    const token = await getWhoToken();
    console.log('WHO Token:', token);

    const response = await fetch(`${baseUrl}/icdapi`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('WHO Data:', data);
    return data;
  } catch (error) {
    console.error('WHO API failed:', error);
    return null;
  }
}
