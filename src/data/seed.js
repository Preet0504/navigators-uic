// Demo content shown when the backend is unreachable or not yet configured,
// so the site always looks alive. Items are flagged `_seed` and use string
// ids — admin write actions are disabled on them until real data exists.

const soon = (days, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const past = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const SEED_EVENTS = [
  { id: 'seed-ev-1', _seed: true, title: 'Welcome Week Bonfire', date: soon(6), address: 'Montrose Beach, Chicago, IL', rsvp_url: '', description: "Kick off the semester with s'mores, music and new friends by the lake. Everyone welcome — bring a friend!", image: '/sample-event.png' },
  { id: 'seed-ev-2', _seed: true, title: 'Fall Retreat Weekend', date: soon(20), address: 'Lake Geneva, WI', rsvp_url: '', description: 'A weekend away to rest, grow and connect. Cabins, hikes, late-night talks and great teaching.', image: '/sample-retreat.png' },
  { id: 'seed-ev-3', _seed: true, title: 'Friendsgiving Dinner', date: soon(34), address: 'Student Center East, UIC', rsvp_url: '', description: 'A big shared table before finals. Bring a dish, bring yourself — we save you a seat.', image: '/sample-event.png' },
  { id: 'seed-ev-4', _seed: true, title: 'Spring Kickoff Night', date: past(40), address: 'UIC Quad', rsvp_url: '', description: 'Where it all started last term. Check the highlights!', image: '/sample-retreat.png' },
];

export const SEED_STUDIES = [
  { id: 'seed-st-1', _seed: true, week: 'Week 1', topic: 'Who Is Jesus?', verse: 'John 1:1-14', summary: 'We opened the Gospel of John and asked the biggest question there is. Great discussion on the Word made flesh and what it means that God moved into the neighborhood.' },
  { id: 'seed-st-2', _seed: true, week: 'Week 2', topic: 'Grace That Finds Us', verse: 'Luke 15:11-32', summary: 'The parable of the prodigal son. We talked about both brothers — and the father who runs.' },
];

export const SEED_LEADERS = [
  { id: 'seed-ld-1', _seed: true, name: 'Sarah Jenkins', role: 'Campus Director', bio: 'Sarah loves connecting people and a good cup of coffee. Always up for a conversation about life, faith and everything in between.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80', sort: 1 },
  { id: 'seed-ld-2', _seed: true, name: 'Marcus Lee', role: 'Student President', bio: 'Senior in Computer Science. Runs the game nights and takes Cold Brew leaderboard standings very seriously.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80', sort: 2 },
  { id: 'seed-ld-3', _seed: true, name: 'Priya Nair', role: 'Small Groups Lead', bio: 'Bio major who believes everyone deserves a place to belong. Ask her about Tuesday Bible study.', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80', sort: 3 },
];

export const SEED_SCORES = [
  { id: 'seed-sc-1', _seed: true, name: 'Marcus', game: 'Uno', date: new Date().toISOString().split('T')[0], score: 4 },
  { id: 'seed-sc-2', _seed: true, name: 'Priya', game: 'Uno', date: new Date().toISOString().split('T')[0], score: 3 },
  { id: 'seed-sc-3', _seed: true, name: 'Sarah', game: 'Uno', date: new Date().toISOString().split('T')[0], score: 2 },
  { id: 'seed-sc-4', _seed: true, name: 'Marcus', game: 'Smash Bros', date: new Date().toISOString().split('T')[0], score: 5 },
  { id: 'seed-sc-5', _seed: true, name: 'David', game: 'Smash Bros', date: new Date().toISOString().split('T')[0], score: 3 },
  { id: 'seed-sc-6', _seed: true, name: 'Priya', game: 'Durak', date: new Date().toISOString().split('T')[0], score: 2 },
];
