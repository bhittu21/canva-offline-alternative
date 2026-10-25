import type { Mood } from '../themes'

/**
 * Words for the meme templates. The formats follow well-known meme shapes
 * (top and bottom text, two-panel choices, expanding brain, starter packs,
 * tier lists...) but every caption is original and every picture is an empty
 * photo frame, so people add their own images.
 */

interface MemeBase {
  id: string
  title: string
  kw: string
  mood: Mood[]
}

export interface ClassicMeme extends MemeBase { top: string; bottom: string }
export interface CaptionMeme extends MemeBase { caption: string }
export interface ChoiceMeme extends MemeBase { no: string; yes: string }
export interface BrainMeme extends MemeBase { steps: [string, string, string, string] }
export interface NobodyMeme extends MemeBase { setup: string; me: string }
export interface PostMeme extends MemeBase { name: string; handle: string; text: string }
export interface VersusMeme extends MemeBase { a: string; b: string; la: string; lb: string }
export interface LabelsMeme extends MemeBase { labels: [string, string, string]; caption?: string }
export interface StarterMeme extends MemeBase { head: string; items: string[] }
export interface TierMeme extends MemeBase { head: string; rows: [string, string][] }
export interface AlignMeme extends MemeBase { head: string; cells: string[] }
export interface SignMeme extends MemeBase { sign: string }
export interface ButtonsMeme extends MemeBase { a: string; b: string; caption: string }
export interface ChartMeme extends MemeBase { head: string; chart: 'line' | 'pie' | 'column' | 'bar' | 'donut'; labels: string[]; values: number[]; note?: string }
export interface VennMeme extends MemeBase { head: string; a: string; b: string; mid: string }
export interface ComicMeme extends MemeBase { panels: [string, string, string, string] }

const fun: Mood[] = ['playful', 'bold']
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

const kwOf = (...parts: string[]) => `meme memes funny humor relatable ${parts.join(' ')}`.toLowerCase()

// ---------------------------------------------------------------- classic top / bottom text

export const classicMemes: ClassicMeme[] = (
  [
    ['Me at 2 AM', 'Finally ready to sleep', 'Brain: remember that thing from 2014?', 'sleep night'],
    ['Monday mood', 'Alarm rings on Monday', 'Me pretending I did not hear it', 'monday work'],
    ['Just one episode', 'Just one more episode', 'Sun is rising', 'tv binge'],
    ['Code works', 'My code works', 'I have no idea why', 'coding programmer developer'],
    ['Code broke', 'Changed one line', 'Everything is on fire', 'coding programmer bug'],
    ['Diet starts tomorrow', 'Diet starts tomorrow', 'Said every day since 2019', 'food diet'],
    ['Group project', 'Group project', 'I am the group', 'school college'],
    ['Wifi down', 'When the wifi goes down', 'And you have to talk to your family', 'wifi internet family'],
    ['Payday', 'Payday', 'Broke again by Thursday', 'money salary'],
    ['Exam tomorrow', 'Exam tomorrow', 'Time to reorganise my entire room', 'study exam procrastination'],
    ['Gym day one', 'Gym day one', 'Cannot climb stairs day two', 'gym fitness'],
    ['Online shopping', 'Added to cart', 'Closed the app feeling rich', 'shopping money'],
    ['Phone at 1%', 'Phone at 1 percent', 'Suddenly the most important call', 'phone battery'],
    ['Weekend plans', 'Big weekend plans', 'Stayed in bed watching videos', 'weekend lazy'],
    ['Mom calls', 'Mom calls my full name', 'Instant memory of every crime', 'mom family'],
    ['Meeting email', 'This meeting', 'Could have been an email', 'work office meeting'],
    ['Five more minutes', 'Five more minutes', 'Wakes up three hours later', 'sleep morning'],
    ['Tea is hot', 'Makes tea', 'Forgets it until it is cold', 'tea coffee'],
    ['Cat on keyboard', 'Cat walks on keyboard', 'Sends email to my boss', 'cat pets work'],
    ['Delivery tracking', 'Package out for delivery', 'Me at the window all day', 'shopping delivery'],
    ['Autocorrect', 'Autocorrect', 'Ruining my life one word at a time', 'phone texting'],
    ['Small talk', 'Someone says nice weather', 'Me with no follow-up question', 'social awkward'],
    ['Leftovers', 'Opens fridge', 'Same food as ten minutes ago', 'food fridge'],
    ['Game update', 'Ready to play', 'Update required: 40 GB', 'gaming gamer'],
    ['Save button', 'Forgot to save', 'App crashed', 'computer work'],
    ['Teacher says', 'Teacher: this will not be on the test', 'The test:', 'school teacher exam'],
    ['Charger', 'Has three chargers', 'Cannot find one', 'phone charger'],
    ['Plans cancelled', 'Plans got cancelled', 'Best day ever', 'introvert social'],
    ['Spider', 'Saw a spider', 'Now I live here forever on edge', 'spider fear'],
    ['Weekday', 'It is only Tuesday', 'Feels like a whole month', 'week work']
  ] as const
).map(([title, top, bottom, kw]) => ({ id: slug(title), title: `${title} meme`, kw: kwOf('classic top bottom text impact', kw), mood: fun, top, bottom }))

// ---------------------------------------------------------------- caption above a photo

export const captionMemes: CaptionMeme[] = (
  [
    ['POV: you said you would sleep early', 'sleep night pov'],
    ['POV: the teacher picks you to answer', 'school pov'],
    ['POV: you open the fridge for the 12th time', 'food fridge pov'],
    ['POV: your code compiled on the first try', 'coding programmer pov'],
    ['POV: you hear your name in someone else’s conversation', 'social pov'],
    ['POV: the group chat is suddenly quiet after you text', 'friends chat pov'],
    ['POV: the waiter says enjoy your meal and you say you too', 'awkward pov'],
    ['POV: you check your bank account after the weekend', 'money pov'],
    ['POV: you finally find the TV remote', 'home pov'],
    ['POV: it is Friday at 4:59 PM', 'work friday pov'],
    ['When you wake up before the alarm and realise you can sleep 2 more hours', 'sleep morning'],
    ['When the food arrives and it looks exactly like the picture', 'food delivery'],
    ['When you finish a task and immediately get three more', 'work productivity'],
    ['When someone says “quick question” and it is not quick', 'work office'],
    ['When you open a tab to check one thing and end up with 47 tabs', 'internet computer'],
    ['When you laugh at your own joke before finishing it', 'jokes friends'],
    ['When the bus arrives just as you reach the stop', 'travel luck'],
    ['When you remember an embarrassing moment from 10 years ago', 'awkward memories'],
    ['When the song you skip plays again', 'music playlist'],
    ['When your friend says “I have tea” and you instantly sit down', 'friends gossip'],
    ['When the game says “auto-saving” and you have not saved in hours', 'gaming gamer'],
    ['When you find money in last winter’s jacket', 'money luck'],
    ['When the meeting ends five minutes early', 'work meeting'],
    ['When your mom says “we have food at home”', 'mom food family'],
    ['When the phone says 100% and you feel unstoppable', 'phone battery'],
    ['Me explaining my 3-hour nap as “resting my eyes”', 'sleep nap'],
    ['Me after cleaning one corner of my room', 'cleaning home'],
    ['Me watching the progress bar stuck at 99%', 'computer waiting'],
    ['Me pretending to understand the assignment', 'school college'],
    ['Me when someone eats the snack I was saving', 'food snack'],
    ['My last brain cell during an exam', 'exam study'],
    ['My plants after I remember to water them', 'plants home'],
    ['My bank account looking at my online cart', 'money shopping'],
    ['The dog when you say the word “walk”', 'dog pets'],
    ['The cat at 3 AM for no reason', 'cat pets night']
  ] as const
).map(([caption, kw]) => ({ id: slug(caption), title: caption.length > 42 ? `${caption.slice(0, 40).trim()}…` : caption, kw: kwOf('caption pov when me reaction', kw), mood: fun, caption }))

// ---------------------------------------------------------------- two-panel choice (no / yes)

export const choiceMemes: ChoiceMeme[] = (
  [
    ['Doing homework', 'Making a plan to do homework tomorrow', 'study school'],
    ['Going to bed early', 'Watching videos about sleep at 3 AM', 'sleep night'],
    ['Reading the instructions', 'Figuring it out after it breaks', 'diy'],
    ['Writing clean code', 'Adding one more comment that says “fix later”', 'coding programmer'],
    ['Cooking a healthy dinner', 'Toast again', 'food cooking'],
    ['Answering the phone', 'Replying by text 3 hours later', 'phone introvert'],
    ['Buying what I need', 'Buying what is on sale', 'shopping'],
    ['Saving money', 'Saving the receipts', 'money'],
    ['Going outside', 'Watching people go outside online', 'introvert home'],
    ['Paying for streaming', 'Using a friend’s password', 'tv streaming'],
    ['Studying for the exam', 'Hoping the exam is easy', 'exam study'],
    ['Making new friends', 'Becoming friends with a cat', 'cat pets'],
    ['Taking the stairs', 'Waiting 5 minutes for the lift', 'lazy'],
    ['Drinking water', 'Fourth coffee of the day', 'coffee'],
    ['Folding the laundry', 'Living out of the laundry basket', 'home chores'],
    ['Updating the software now', 'Remind me tomorrow', 'computer'],
    ['Simple password', 'Password nobody can remember, including me', 'computer internet'],
    ['A normal sleep schedule', 'Chaos', 'sleep']
  ] as const
).map(([no, yes, kw]) => ({ id: slug(`${no} vs ${yes}`), title: `${no.slice(0, 26)} vs ${yes.slice(0, 22)} meme`, kw: kwOf('two panel choice approve disapprove prefer', kw), mood: fun, no, yes }))

// ---------------------------------------------------------------- expanding brain

export const brainMemes: BrainMeme[] = (
  [
    ['Ways to wake up', ['Alarm clock', 'Three alarm clocks', 'Alarm across the room', 'Simply never sleeping'], 'sleep'],
    ['Ways to save files', ['final.docx', 'final2.docx', 'final-REAL.docx', 'final-REAL-v2 (use this).docx'], 'computer work'],
    ['Ways to study', ['Reading the book', 'Highlighting the book', 'Highlighting the whole book', 'Holding the book under your pillow'], 'study school'],
    ['Ways to fix a bug', ['Reading the error', 'Searching the error', 'Restarting the computer', 'Adding a print on every line'], 'coding programmer'],
    ['Ways to say no', ['No', 'Maybe', 'I will check my calendar', 'Leaving the country'], 'social'],
    ['Ways to cook', ['Following a recipe', 'Guessing the recipe', 'Ordering food', 'Cereal for dinner'], 'food'],
    ['Ways to exercise', ['Running', 'Walking', 'Walking to the fridge', 'Thinking about the gym'], 'gym fitness'],
    ['Ways to save money', ['Making a budget', 'Using a budget app', 'Not opening the banking app', 'Not having money to spend'], 'money'],
    ['Ways to reply to a text', ['Replying right away', 'Replying later', 'Reading it in the notification', 'Replying in your head'], 'texting phone'],
    ['Ways to clean your room', ['Cleaning it', 'Hiding things in the closet', 'Turning off the light', 'Moving out'], 'cleaning home']
  ] as const
).map(([title, steps, kw]) => ({ id: slug(title), title: `${title} brain meme`, kw: kwOf('expanding brain levels galaxy smart', kw), mood: fun, steps: [...steps] as [string, string, string, string] }))

// ---------------------------------------------------------------- nobody / me

export const nobodyMemes: NobodyMeme[] = (
  [
    ['Nobody:', 'Me at 3 AM: I should learn three languages', 'night'],
    ['Nobody:', 'Me: opening the fridge to see if anything new appeared', 'food'],
    ['Absolutely no one:', 'My brain during an exam: song lyrics from 2009', 'exam'],
    ['Nobody:', 'My cat: knocking one thing off the table, slowly', 'cat'],
    ['Nobody:', 'Me: practising arguments in the shower I will never have', 'shower'],
    ['Not a single person:', 'Me: telling everyone I am “not a morning person”', 'morning'],
    ['Nobody:', 'My phone: “Your storage is almost full”', 'phone'],
    ['Nobody asked:', 'Me: explaining my favourite show for 40 minutes', 'tv'],
    ['Nobody:', 'My dog: barking at a leaf', 'dog'],
    ['No one at all:', 'Me: buying a notebook I will never write in', 'shopping stationery'],
    ['Nobody:', 'My laptop fan during one browser tab: TAKE-OFF', 'computer'],
    ['Nobody:', 'Me: saying “we should hang out” and never planning it', 'friends']
  ] as const
).map(([setup, me, kw], i) => ({ id: `nobody-${i + 1}-${slug(kw)}`, title: `Nobody / me meme: ${kw}`, kw: kwOf('nobody me absolutely no one', kw), mood: fun, setup, me }))

// ---------------------------------------------------------------- social post screenshot

export const postMemes: PostMeme[] = (
  [
    ['Sleepy Human', '@needsmorecoffee', 'my body: please sleep\nmy brain: what if penguins had knees', 'sleep'],
    ['Daily Struggles', '@justgettingby', 'cleaned my room for 10 minutes. time for a 3 hour break', 'cleaning'],
    ['Code Goblin', '@semicolonlost', 'it works on my computer. ship my computer', 'coding programmer'],
    ['Snack Department', '@fridgeinspector', 'ate a salad today. I am basically a different person now', 'food'],
    ['Plant Parent', '@overwatered', 'bought a plant to feel calm. now I check on it 40 times a day', 'plants'],
    ['Group Chat CEO', '@readat3am', 'me: I will reply later\nme 4 days later: haha', 'texting'],
    ['Study Mode', '@chapterone', 'opened the textbook. smelled the textbook. closed the textbook', 'study'],
    ['Weekend Warrior', '@sundayscaries', 'weekends should be at least 5 days. I am open to discussion', 'weekend'],
    ['Office Hero', '@replyall', 'my favourite part of the meeting is when it ends', 'work'],
    ['Gamer Mode', '@onemorematch', 'one more game I said. that was in a different season', 'gaming'],
    ['Cat Servant', '@fedbutstarving', 'my cat ate 5 minutes ago and is acting like it has been a decade', 'cat'],
    ['Money Moves', '@budgetbeginner', 'saving money is easy. you just do not look at anything nice ever', 'money'],
    ['Gym Era', '@leg_day_tomorrow', 'joined the gym in January. we are now in a long distance relationship', 'gym'],
    ['Weather Watcher', '@umbrella_forgot', 'the forecast said sunny. the sky said: no', 'weather'],
    ['Sleep Scientist', '@nap_enthusiast', 'naps are just tiny vacations you take every afternoon', 'nap']
  ] as const
).map(([name, handle, text, kw]) => ({ id: slug(handle), title: `${name} post meme`, kw: kwOf('tweet post screenshot text social', kw), mood: fun, name, handle, text }))

// ---------------------------------------------------------------- side by side

export const versusMemes: VersusMeme[] = (
  [
    ['Expectation', 'Reality', 'How I planned the weekend', 'How the weekend went', 'weekend'],
    ['Expectation', 'Reality', 'Recipe photo', 'My version', 'cooking food'],
    ['Expectation', 'Reality', 'Haircut I showed', 'Haircut I got', 'hair'],
    ['How it started', 'How it’s going', 'First day at the gym', 'Third day at the gym', 'gym'],
    ['How it started', 'How it’s going', 'New notebook, perfect handwriting', 'Page 3', 'school'],
    ['How it started', 'How it’s going', 'Learning to code', 'Googling every error', 'coding'],
    ['Me in January', 'Me in December', 'Goals, plans, energy', 'Surviving', 'new year'],
    ['Me at 9 AM', 'Me at 5 PM', 'Ready to work', 'Ready to sleep', 'work'],
    ['What I ordered', 'What arrived', 'Big cosy sweater', 'Doll-sized sweater', 'shopping'],
    ['Online', 'In person', 'Funny, outgoing', 'Says nothing', 'social introvert'],
    ['Before coffee', 'After coffee', 'Zombie', 'CEO energy', 'coffee'],
    ['Day 1 of holiday', 'Last day of holiday', 'Relaxed', 'Panicking about work', 'holiday'],
    ['My plan', 'My cat’s plan', 'Work from home', 'Sit on the keyboard', 'cat'],
    ['Teacher is here', 'Teacher left the room', 'Silent angels', 'Total chaos', 'school'],
    ['Weekday me', 'Weekend me', 'Up at 6', 'Up at noon', 'sleep weekend']
  ] as const
).map(([la, lb, a, b, kw]) => ({ id: slug(`${la} ${lb} ${kw} ${a}`), title: `${la} vs ${lb}: ${kw} meme`, kw: kwOf('expectation reality how it started how its going comparison', kw), mood: fun, la, lb, a, b }))

// ---------------------------------------------------------------- labelled photo

export const labelMemes: LabelsMeme[] = (
  [
    [['Me', 'New hobby', 'The 12 hobbies I already started'], 'Me starting yet another hobby', 'hobby'],
    [['Me', 'A nap', 'My to-do list'], undefined, 'nap'],
    [['Developers', 'A new framework', 'The project that already works'], undefined, 'coding programmer'],
    [['Me', 'Snacks', 'My diet plan'], undefined, 'food diet'],
    [['My wallet', 'Online sale', 'Rent'], undefined, 'money shopping'],
    [['Students', 'Phone', 'The lecture'], undefined, 'school'],
    [['Gamers', 'New game', 'Unfinished game list'], undefined, 'gaming'],
    [['Me', 'Bed at 2 PM', 'Productive afternoon'], undefined, 'sleep'],
    [['My brain', 'Random song', 'Things I need to remember'], 'Every single day', 'brain'],
    [['Cat', 'Empty box', 'Expensive cat bed'], undefined, 'cat'],
    [['Me', 'Another episode', 'Sleep'], undefined, 'tv'],
    [['Team', 'Last minute changes', 'The deadline'], undefined, 'work']
  ] as const
).map(([labels, caption, kw], i) => ({ id: `labels-${i + 1}-${slug(kw)}`, title: `Labelled photo meme: ${kw}`, kw: kwOf('labels labelled photo object distracted', kw), mood: fun, labels: [...labels] as [string, string, string], ...(caption ? { caption } : {}) }))

// ---------------------------------------------------------------- starter packs

export const starterMemes: StarterMeme[] = (
  [
    ['Student starter pack', ['Cold coffee', '27 open tabs', 'Charger that barely works', 'Notes from a friend', 'Last-minute essay', 'Instant noodles'], 'school college'],
    ['Programmer starter pack', ['Dark mode everything', 'Rubber duck', 'Coffee number 4', 'Stack of errors', 'Mechanical keyboard', '“It works on my machine”'], 'coding'],
    ['Gamer starter pack', ['RGB lights', 'Energy drink', 'Headset on all day', '“One more game”', 'Unplayed game library', 'Snack crumbs'], 'gaming'],
    ['Work from home starter pack', ['Shirt on top, pyjamas below', 'Muted microphone', 'Cat on the keyboard', 'Kitchen office', 'Coffee mug collection', 'Camera off'], 'work home'],
    ['Gym beginner starter pack', ['Brand new shoes', 'Huge water bottle', 'Mirror selfie', 'Leg day skipped', 'Protein shake', 'Gym playlist'], 'gym'],
    ['Plant parent starter pack', ['17 tiny pots', 'Plant app', 'Talking to plants', 'One dead cactus', 'Spray bottle', 'Sunny windowsill'], 'plants'],
    ['Traveller starter pack', ['Neck pillow', 'Overpacked suitcase', '5 AM airport coffee', 'Passport panic', 'Map app', 'Souvenir magnets'], 'travel'],
    ['Night owl starter pack', ['3 AM snack', 'Phone brightness at 1%', 'Deep thoughts', 'Morning alarms ignored', 'Blanket cave', 'Midnight playlist'], 'night sleep'],
    ['Coffee lover starter pack', ['Three mugs on the desk', 'Coffee grinder', 'Cafe loyalty card', 'Shaky hands', '“Just one more cup”', 'Latte art attempt'], 'coffee'],
    ['New parent starter pack', ['No sleep', 'Cold coffee', 'Baby wipes everywhere', '400 photos a day', 'Lullaby on repeat', 'Snack in one hand'], 'parents family']
  ] as const
).map(([head, items, kw]) => ({ id: slug(head), title: head, kw: kwOf('starter pack collection', kw), mood: fun, head, items: [...items] }))

// ---------------------------------------------------------------- tier lists

export const tierMemes: TierMeme[] = (
  [
    ['Snacks tier list', [['S', 'Chips · Chocolate'], ['A', 'Popcorn · Cookies'], ['B', 'Crackers'], ['C', 'Rice cakes'], ['D', 'Raisins in cookies']], 'food snacks'],
    ['Weekdays tier list', [['S', 'Saturday · Friday night'], ['A', 'Sunday morning'], ['B', 'Friday'], ['C', 'Wednesday'], ['D', 'Monday']], 'week'],
    ['Breakfast tier list', [['S', 'Pancakes'], ['A', 'Eggs and toast'], ['B', 'Cereal'], ['C', 'Coffee only'], ['D', 'Skipped it']], 'food breakfast'],
    ['Pets tier list', [['S', 'Dogs · Cats'], ['A', 'Rabbits'], ['B', 'Fish'], ['C', 'Hamster at 3 AM'], ['D', 'Pet rock']], 'pets'],
    ['Study spots tier list', [['S', 'Library corner'], ['A', 'Quiet cafe'], ['B', 'Desk at home'], ['C', 'Bed'], ['D', 'Bed with phone']], 'study'],
    ['Seasons tier list', [['S', 'Autumn'], ['A', 'Spring'], ['B', 'Winter'], ['C', 'Summer'], ['D', 'Allergy season']], 'weather'],
    ['Weekend activities tier list', [['S', 'Sleeping in'], ['A', 'Brunch'], ['B', 'Movie night'], ['C', 'Chores'], ['D', 'Setting an alarm']], 'weekend'],
    ['Phone notifications tier list', [['S', 'Payment received'], ['A', 'Friend’s message'], ['B', 'Delivery update'], ['C', 'App update'], ['D', 'Storage full']], 'phone']
  ] as const
).map(([head, rows, kw]) => ({ id: slug(head), title: head, kw: kwOf('tier list ranking s a b c d', kw), mood: fun, head, rows: rows.map(([a, b]) => [a, b] as [string, string]) }))

// ---------------------------------------------------------------- alignment charts

const alignAxes = ['Lawful good', 'Neutral good', 'Chaotic good', 'Lawful neutral', 'True neutral', 'Chaotic neutral', 'Lawful evil', 'Neutral evil', 'Chaotic evil']
export const alignMemes: AlignMeme[] = (
  [
    ['Snack eating alignment chart', 'food snacks'],
    ['Group chat alignment chart', 'friends chat'],
    ['Office worker alignment chart', 'work office'],
    ['Pet behaviour alignment chart', 'pets cat dog'],
    ['Student alignment chart', 'school']
  ] as const
).map(([head, kw]) => ({ id: slug(head), title: head, kw: kwOf('alignment chart lawful chaotic good evil', kw), mood: fun, head, cells: alignAxes }))

// ---------------------------------------------------------------- opinion sign

export const signMemes: SignMeme[] = (
  [
    ['Breakfast for dinner is the best dinner', 'food'],
    ['Cats are just tiny landlords', 'cat'],
    ['Naps should be part of the work day', 'work nap'],
    ['Socks with sandals are comfortable', 'fashion'],
    ['Cereal is a soup', 'food'],
    ['Weekends need a third day', 'weekend'],
    ['Pineapple belongs on pizza', 'food pizza'],
    ['The best part of a trip is the snacks', 'travel'],
    ['Dark mode makes code run faster', 'coding'],
    ['Five-minute breaks should be twenty', 'work']
  ] as const
).map(([sign, kw]) => ({ id: slug(sign), title: `Opinion sign meme: ${sign.slice(0, 30)}`, kw: kwOf('change my mind opinion sign hot take', kw), mood: fun, sign }))

// ---------------------------------------------------------------- two buttons dilemma

export const buttonMemes: ButtonsMeme[] = (
  [
    ['Sleep early', 'One more video', 'Me at midnight', 'sleep'],
    ['Save money', 'Buy the cute thing', 'Me in any shop', 'money shopping'],
    ['Start the essay', 'Clean the whole house', 'Me before a deadline', 'study'],
    ['Healthy salad', 'Pizza', 'Me at lunch', 'food'],
    ['Reply now', 'Reply in 3 days', 'Me with a new message', 'texting'],
    ['Go to the gym', 'Watch gym videos', 'Me after work', 'gym'],
    ['Fix the bug', 'Rename the variables', 'Me as a developer', 'coding'],
    ['Go to the party', 'Stay home with snacks', 'Me on Friday', 'introvert'],
    ['Finish the game', 'Start a new game', 'Me as a gamer', 'gaming'],
    ['Wake up', 'Snooze again', 'Me every morning', 'morning']
  ] as const
).map(([a, b, caption, kw]) => ({ id: slug(`${a} or ${b}`), title: `${a} or ${b} meme`, kw: kwOf('two buttons dilemma choice sweating hard decision', kw), mood: fun, a, b, caption }))

// ---------------------------------------------------------------- funny charts

export const chartMemes: ChartMeme[] = (
  [
    ['My energy during the day', 'line', ['8 AM', '10 AM', '12 PM', '3 PM', '6 PM', '11 PM'], [10, 30, 45, 15, 50, 100], 'Peak energy: exactly when I should sleep', 'energy sleep'],
    ['My motivation this week', 'line', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [80, 60, 40, 30, 90, 100, 5], 'Sunday night: panic', 'week'],
    ['How I spend my phone time', 'pie', ['Scrolling', 'Memes', 'Messages', 'Actually useful'], [45, 30, 20, 5], undefined, 'phone'],
    ['What I do in meetings', 'donut', ['Nodding', 'Thinking about lunch', 'Waiting for it to end', 'Talking'], [30, 35, 30, 5], undefined, 'work meeting'],
    ['Things in my bag', 'pie', ['Receipts', 'Snacks', 'Chargers', 'Things I need'], [40, 30, 25, 5], undefined, 'bag'],
    ['Why I am late', 'bar', ['Snoozed', 'Lost keys', 'Traffic', 'Started a new show', 'Honestly no idea'], [40, 25, 15, 10, 30], undefined, 'late'],
    ['Exam preparation', 'column', ['Week 1', 'Week 2', 'Week 3', 'Night before'], [5, 5, 10, 95], 'Study hours (estimated)', 'exam study'],
    ['Cups of coffee by day', 'column', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], [5, 4, 4, 3, 1], 'Friday: running on happiness', 'coffee'],
    ['What my cat does all day', 'pie', ['Sleeping', 'Judging me', 'Knocking things over', 'Eating'], [60, 20, 10, 10], undefined, 'cat'],
    ['My fridge visits', 'line', ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '9 PM'], [1, 3, 4, 6, 8, 12], 'Nothing new appeared. Still checking.', 'food fridge'],
    ['Time spent choosing a movie vs watching it', 'bar', ['Choosing', 'Watching'], [70, 30], undefined, 'movie tv'],
    ['How my code works', 'donut', ['Logic', 'Copy and paste', 'Hope', 'Coffee'], [15, 30, 35, 20], undefined, 'coding']
  ] as const
).map(([head, chart, labels, values, note, kw]) => ({ id: slug(head), title: `${head} chart meme`, kw: kwOf('chart graph statistics funny data', kw), mood: fun, head, chart, labels: [...labels], values: [...values], ...(note ? { note } : {}) }))

// ---------------------------------------------------------------- venn diagrams

export const vennMemes: VennMeme[] = (
  [
    ['The perfect weekend', 'Sleeping in', 'Good food', 'Breakfast in bed', 'weekend'],
    ['Programmers', 'Writing code', 'Fixing code', 'Writing new bugs', 'coding'],
    ['Cats', 'Wants to go outside', 'Wants to come inside', 'Standing in the doorway', 'cat'],
    ['Students', 'Studying', 'Sleeping', 'Sleeping on the textbook', 'school'],
    ['Me online shopping', 'Things I need', 'Things on sale', 'Things I bought', 'shopping'],
    ['Group projects', 'People who plan', 'People who work', 'Just you', 'school'],
    ['My playlist', 'Songs I love', 'Songs I skip', 'The same three songs', 'music'],
    ['Coffee', 'Tastes good', 'Keeps me awake', 'Why I am still awake at 2 AM', 'coffee']
  ] as const
).map(([head, a, b, mid, kw]) => ({ id: slug(`venn ${head}`), title: `${head} Venn diagram meme`, kw: kwOf('venn diagram overlap', kw), mood: fun, head, a, b, mid }))

// ---------------------------------------------------------------- four-panel comics

export const comicMemes: ComicMeme[] = (
  [
    [['Me: I will go to bed early tonight', '10 PM: almost ready', '1 AM: one last video', '4 AM: why am I like this'], 'sleep'],
    [['Starts homework', 'Gets a snack', 'Reorganises desk', 'It is midnight'], 'study'],
    [['Writes code', 'It works', 'Changes nothing', 'It stops working'], 'coding'],
    [['Monday: new week, new me', 'Tuesday: still going', 'Wednesday: hmm', 'Thursday: old me is back'], 'week'],
    [['Buys a plant', 'Names the plant', 'Forgets to water it', 'Buys another plant'], 'plants'],
    [['Diet day 1: salad', 'Diet day 2: salad', 'Diet day 3: smaller pizza', 'Diet day 4: what diet'], 'food'],
    [['Opens the game for 10 minutes', 'Just one level', 'The sun is up', 'Worth it'], 'gaming'],
    [['Cleans the room', 'Finds old photos', 'Looks at every photo', 'Room is messier'], 'cleaning']
  ] as const
).map(([panels, kw], i) => ({ id: `comic-${i + 1}-${slug(kw)}`, title: `Four-panel meme: ${kw}`, kw: kwOf('four panel comic story', kw), mood: fun, panels: [...panels] as [string, string, string, string] }))
