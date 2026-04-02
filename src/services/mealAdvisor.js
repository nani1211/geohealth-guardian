/**
 * mealAdvisor.js — Smart meal timing logic for route travel.
 *
 * Pure logic module (no network calls). Takes route timing data, food stops,
 * and user preferences to generate contextual meal recommendations.
 */

/**
 * Parse a "HH:MM" string into total minutes since midnight.
 */
function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes since midnight to a human-readable time string.
 */
function formatTime(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440; // handle overflow past midnight
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Check if a name loosely matches any of the favorite food keywords.
 * @param {string} placeName — e.g. "Taco Bell", "Olive Garden Italian Kitchen"
 * @param {string[]} favorites — e.g. ["mexican", "italian", "burger"]
 * @returns {string|null} — the matched keyword, or null
 */
function matchFavorite(placeName, favorites) {
  if (!favorites?.length || !placeName) return null;
  const lower = placeName.toLowerCase();

  // Common food type → keyword mappings for fuzzy matching
  const CUISINE_HINTS = {
    'mexican': ['taco', 'burrito', 'mexican', 'chipotle', 'qdoba', 'el ', 'la '],
    'italian': ['italian', 'olive garden', 'pizza', 'pasta', 'romano', 'fazoli'],
    'burger':  ['burger', 'wendy', 'five guys', 'shake shack', 'in-n-out', 'mcdonald', "arby"],
    'pizza':   ['pizza', 'domino', 'papa john', 'little caesar'],
    'chinese': ['chinese', 'panda express', 'wok', 'china', 'hunan', 'szechuan'],
    'indian':  ['indian', 'curry', 'tandoor', 'masala', 'biryani'],
    'sushi':   ['sushi', 'japanese', 'hibachi', 'ramen'],
    'bbq':     ['bbq', 'barbecue', 'smokehouse', 'grill'],
    'chicken': ['chicken', 'chick-fil-a', 'popeye', 'kfc', 'wingstop', 'zaxby'],
    'coffee':  ['coffee', 'starbucks', 'dunkin', 'café', 'cafe', 'espresso'],
    'sandwich':['subway', 'sandwich', 'jimmy john', 'jersey mike', 'panera'],
  };

  for (const fav of favorites) {
    const favLower = fav.toLowerCase();
    // Direct keyword match
    if (lower.includes(favLower)) return fav;
    // Check cuisine hints
    const hints = CUISINE_HINTS[favLower];
    if (hints && hints.some((h) => lower.includes(h))) return fav;
  }

  return null;
}

/**
 * Generate meal recommendations for food stops along a route.
 *
 * @param {Object} params
 * @param {Array} params.foodStops — stops with type='food', each having { name, mileMarker, lat, lon }
 * @param {number} params.totalMiles — total route distance
 * @param {number} params.totalMinutes — total route travel time  
 * @param {Object} params.mealWindows — { lunch: {start, end}, dinner: {start, end} }
 * @param {string[]} params.favoriteFoods — user's food preferences
 * @param {Date} [params.departureTime] — when the user departs (defaults to now)
 * @returns {Array<{ stop, estimatedArrival, mealType, isFavorite, matchedCuisine, suggestion }>}
 */
export function generateMealRecommendations({
  foodStops = [],
  totalMiles = 0,
  totalMinutes = 0,
  mealWindows = {},
  favoriteFoods = [],
  departureTime = new Date(),
}) {
  if (!foodStops.length || !totalMiles || !totalMinutes) return [];

  const departureMinutes = departureTime.getHours() * 60 + departureTime.getMinutes();

  // Speed in miles per minute
  const speed = totalMiles / totalMinutes;

  // Parse meal windows
  const windows = {};
  for (const [meal, w] of Object.entries(mealWindows)) {
    if (w?.start && w?.end) {
      windows[meal] = {
        start: parseTimeToMinutes(w.start),
        end: parseTimeToMinutes(w.end),
      };
    }
  }

  const recommendations = [];
  const usedMeals = new Set(); // Don't recommend same meal type twice

  for (const stop of foodStops) {
    // Estimate minutes to reach this stop based on mile marker
    const etaMinutes = speed > 0 ? stop.mileMarker / speed : 0;
    const arrivalMinutes = departureMinutes + etaMinutes;
    const arrivalTimeStr = formatTime(Math.round(arrivalMinutes));

    // Check meal window match
    let mealType = null;
    for (const [meal, window] of Object.entries(windows)) {
      if (arrivalMinutes >= window.start && arrivalMinutes <= window.end && !usedMeals.has(meal)) {
        mealType = meal;
        break;
      }
    }

    // Check favorites
    const matchedCuisine = matchFavorite(stop.name, favoriteFoods);
    const isFavorite = matchedCuisine !== null;

    // Only recommend if there's a meal window match, a favorite match, or a long gap
    if (!mealType && !isFavorite) continue;

    // Build suggestion text
    let suggestion = '';
    if (mealType && isFavorite) {
      suggestion = `⭐ Your favorite ${matchedCuisine} — perfect for ${mealType}!`;
      usedMeals.add(mealType);
    } else if (mealType) {
      suggestion = `Arriving ~${arrivalTimeStr} — great time for ${mealType}`;
      usedMeals.add(mealType);
    } else if (isFavorite) {
      suggestion = `⭐ Your favorite ${matchedCuisine} nearby — consider a stop!`;
    }

    recommendations.push({
      stop,
      estimatedArrival: arrivalTimeStr,
      mealType,
      isFavorite,
      matchedCuisine,
      suggestion,
    });
  }

  return recommendations;
}
