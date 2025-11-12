import { config } from 'dotenv';
config();
import { firestore } from '../firebase.js';
import { v4 as uuidv4 } from 'uuid';
// Replace with your tournamentId and demo users
const tournamentId = 'JVlOYUyRlmlXnld5UmZz';
// Generate 20 demo users
const demoUsers = Array.from({ length: 20 }, (_, i) => {
    const n = i + 1;
    return {
        userId: `demoUser${n}`,
        displayName: `Player${n}`,
        gameId: `${10000 + n}`,
        username: `player${n}`,
        teamName: `team${n}`,
    };
});
async function seedRegistrations() {
    for (const user of demoUsers) {
        const registrationId = uuidv4();
        const registration = {
            registrationId,
            tournamentId,
            userId: user.userId,
            displayName: user.displayName,
            gameId: user.gameId,
            kills: 0,
            position: null,
            registeredAt: new Date(),
            status: 'registered',
            teamMembers: [
                {
                    gameId: user.gameId,
                    isOwner: true,
                    username: user.username,
                    teamName: user.teamName,
                }
            ],
            teammates: [],
            totalPrizeEarned: 0
        };
        await firestore.collection('tournament_registrations').doc(registrationId).set(registration);
        console.log(`Seeded registration for user ${user.displayName}`);
    }
    console.log('Seeding complete.');
}
seedRegistrations().catch(console.error);
