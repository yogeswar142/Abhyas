const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
function stamp() {
    return `${DIM}${new Date().toLocaleTimeString()}${RESET}`;
}
export const log = {
    info(msg) {
        console.log(`${stamp()} ${CYAN}•${RESET} ${msg}`);
    },
    ok(msg) {
        console.log(`${stamp()} ${GREEN}✓${RESET} ${msg}`);
    },
    warn(msg) {
        console.log(`${stamp()} ${YELLOW}!${RESET} ${msg}`);
    },
    err(msg) {
        console.error(`${stamp()} ${RED}✗${RESET} ${msg}`);
    },
    banner(url, model) {
        console.log('');
        console.log(`${BOLD}${GREEN}  Abhyas Bridge${RESET}`);
        console.log(`  ${DIM}──────────────${RESET}`);
        console.log(`  URL   ${CYAN}${url}${RESET}`);
        console.log(`  Model ${model}`);
        console.log(`  ${DIM}Paste this URL into Abhyas → Local AI${RESET}`);
        console.log('');
    },
};
