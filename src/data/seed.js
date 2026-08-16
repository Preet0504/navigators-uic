// Demo content shown when the backend is unreachable or not yet configured,
// so the site always looks alive. Items are flagged `_seed` and use string
// ids — admin write actions are disabled on them until real data exists.

// Community map pins — a spread of locations so the map looks alive offline.
// `count` is a demo-only aggregate; real pins each represent one visitor row.
export const SEED_PINS = [
  { id: 'seed-pin-1', _seed: true, country: 'United States', country_code: 'US', state: 'Illinois', state_code: 'IL', lat: 40.3363, lng: -89.0022 },
  { id: 'seed-pin-2', _seed: true, country: 'United States', country_code: 'US', state: 'California', state_code: 'CA', lat: 36.7783, lng: -119.4179 },
  { id: 'seed-pin-3', _seed: true, country: 'United States', country_code: 'US', state: 'Texas', state_code: 'TX', lat: 31.9686, lng: -99.9018 },
  { id: 'seed-pin-4', _seed: true, country: 'India', country_code: 'IN', state: 'Maharashtra', state_code: 'MH', lat: 19.7515, lng: 75.7139 },
  { id: 'seed-pin-5', _seed: true, country: 'India', country_code: 'IN', state: 'Gujarat', state_code: 'GJ', lat: 22.2587, lng: 71.1924 },
  { id: 'seed-pin-6', _seed: true, country: 'Nigeria', country_code: 'NG', state: 'Lagos', state_code: 'LA', lat: 6.5244, lng: 3.3792 },
  { id: 'seed-pin-7', _seed: true, country: 'South Korea', country_code: 'KR', state: 'Seoul', state_code: '11', lat: 37.5665, lng: 126.978 },
  { id: 'seed-pin-8', _seed: true, country: 'Brazil', country_code: 'BR', state: 'São Paulo', state_code: 'SP', lat: -23.5505, lng: -46.6333 },
  { id: 'seed-pin-9', _seed: true, country: 'United Kingdom', country_code: 'GB', state: 'England', state_code: 'ENG', lat: 52.3555, lng: -1.1743 },
  { id: 'seed-pin-10', _seed: true, country: 'Philippines', country_code: 'PH', state: 'Metro Manila', state_code: '00', lat: 14.5995, lng: 120.9842 },
];

// Feedback wall — approved messages so the wall isn't empty offline. Lengths are
// deliberately mixed so the size-by-length blobs and scrolling are visible.
export const SEED_FEEDBACK = [
  { id: 'seed-fb-1', _seed: true, name: 'Aisha', message: 'This community welcomed me my very first week on campus, when I didn’t know a single soul in the whole city. A year later these are the people I call family. I honestly don’t know where I’d be without them.', status: 'approved' },
  { id: 'seed-fb-2', _seed: true, name: 'Daniel', message: 'Cold Brew game nights are the highlight of my week.', status: 'approved' },
  { id: 'seed-fb-3', _seed: true, name: 'Grace', message: 'The Tuesday Bible study finally gave me a place to ask the questions I was always too afraid to ask out loud. No judgment, just honest conversation.', status: 'approved' },
  { id: 'seed-fb-4', _seed: true, name: 'Marcus', message: 'Found my best friends here. Truly.', status: 'approved' },
  { id: 'seed-fb-5', _seed: true, name: 'Priya', message: 'I came for the free coffee and stayed for the people. Somewhere between the bonfires and the late-night talks I found a faith that’s actually mine, and a group that shows up when life gets hard.', status: 'approved' },
  { id: 'seed-fb-6', _seed: true, name: 'Sofia', message: 'A place to belong before you believe anything. That meant everything to me.', status: 'approved' },
  { id: 'seed-fb-7', _seed: true, name: 'Josh', message: 'Everyone actually remembers your name.', status: 'approved' },
  { id: 'seed-fb-8', _seed: true, name: 'Leila', message: 'The retreat weekend changed how I see everything — rest, real friendship, and space to think about the big questions away from the noise of campus. I signed up nervous and left with a whole new group of people I trust.', status: 'approved' },
  { id: 'seed-fb-9', _seed: true, name: 'Andre', message: 'Never thought a campus ministry would feel this genuine. No pressure, just people who care.', status: 'approved' },
  { id: 'seed-fb-10', _seed: true, name: 'Mei', message: 'Ten out of ten, would recommend to anyone feeling lost freshman year.', status: 'approved' },
];
