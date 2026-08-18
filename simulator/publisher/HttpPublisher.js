const DEFAULT_BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:5000/api";
const DEFAULT_TELEMETRY_URL = process.env.BACKEND_TELEMETRY_URL || `${DEFAULT_BACKEND_API_URL}/telemetry`;

class HttpPublisher {
    constructor(url = DEFAULT_TELEMETRY_URL) {
        this.url = url;
        this.lastErrorLogged = false;
    }

    async connect() {
        console.log(`[HttpPublisher] Will POST telemetry to ${this.url}`);
    }

    async send(packet) {
        try {
            const response = await fetch(this.url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(packet),
            });

            if (!response.ok) {
                const body = await response.text().catch(() => "");
                throw new Error(`HTTP ${response.status} ${body}`);
            }

            this.lastErrorLogged = false;
            return true;
        } catch (err) {
            if (!this.lastErrorLogged) {
                console.log(
                    `[HttpPublisher] Could not reach backend at ${this.url} — ${err.message}. ` +
                    `Is the RailMind backend running? Will keep retrying silently.`
                );
                this.lastErrorLogged = true;
            }
            return false;
        }
    }
}

module.exports = HttpPublisher;
