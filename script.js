const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

const request = (path, data) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api9.strem.io',
            path: `/api/${path}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse response from ${path}`));
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
};

async function run() {
    try {
        const email = await ask('Email: ');
        const password = await ask('Password: ');

        if (!email || !password) {
            console.error('Error: Email and password are required.');
            process.exit(1);
        }

        console.log('\nLogging in...');
        const loginRes = await request('login', { email, password });

        if (loginRes.error) {
            console.error(`Login Error: ${loginRes.error}`);
            process.exit(1);
        }

        if (!loginRes.result || !loginRes.result.authKey) {
            console.error('Error: Authentication failed, no AuthKey received.');
            process.exit(1);
        }

        const authKey = loginRes.result.authKey;

        while (true) {
            console.log('Fetching addons...\n');
            const getRes = await request('addonCollectionGet', { authKey });

            if (!getRes.result || !getRes.result.addons) {
                console.error('Error: Could not retrieve addon collection.');
                process.exit(1);
            }

            const addons = getRes.result.addons;

            if (addons.length === 0) {
                console.log('No addons installed.');
                process.exit(0);
            }

            console.log('Installed addons:');
            console.log('─'.repeat(60));
            addons.forEach((addon, i) => {
                const title = (addon.manifest && addon.manifest.name) || 'Unknown';
                console.log(`  ${i + 1}. ${title}`);
                console.log(`     ${addon.transportUrl || '(no URL)'}`);
            });
            console.log('─'.repeat(60));

            const selection = await ask(`\nSelect addon (1-${addons.length}), or "q" to quit: `);

            if (selection.toLowerCase() === 'q') {
                console.log('Goodbye.');
                break;
            }

            const idx = parseInt(selection, 10) - 1;

            if (isNaN(idx) || idx < 0 || idx >= addons.length) {
                console.error('Invalid selection.\n');
                continue;
            }

            const selected = addons[idx];
            const title = (selected.manifest && selected.manifest.name) || 'Unknown';
            console.log(`\nSelected: ${title}`);
            console.log(`URL: ${selected.transportUrl || '(no URL)'}\n`);

            console.log('Operations:');
            console.log('  1. Move to top');
            console.log('  2. Edit transportUrl');

            const op = await ask('\nChoose operation (1-2): ');

            let updatedAddons;

            if (op === '1') {
                updatedAddons = [selected, ...addons.filter((_, i) => i !== idx)];
                console.log(`\nMoving "${title}" to top...`);
            } else if (op === '2') {
                const newUrl = await ask(`New transportUrl: `);
                if (!newUrl) {
                    console.error('Error: URL cannot be empty.\n');
                    continue;
                }
                updatedAddons = addons.map((addon, i) =>
                    i === idx ? { ...addon, transportUrl: newUrl } : addon
                );
                console.log(`\nUpdating transportUrl...`);
            } else {
                console.error('Invalid operation.\n');
                continue;
            }

            const setRes = await request('addonCollectionSet', {
                authKey,
                addons: updatedAddons
            });

            if (setRes.error) {
                console.error(`Sync Error: ${setRes.error}\n`);
                continue;
            }

            console.log('Done. Changes synced successfully.\n');
        }
    } catch (err) {
        console.error(`Unexpected Error: ${err.message}`);
        process.exit(1);
    } finally {
        rl.close();
    }
}

run();