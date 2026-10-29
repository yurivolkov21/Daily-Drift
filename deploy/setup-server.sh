#!/usr/bin/env bash
#
# Prepares a fresh Ubuntu 24.04 server to run Daily Drift:
#   - PHP 8.4 (FPM and CLI), Caddy with automatic HTTPS, and sqlite3;
#   - a "deploy" user, the /var/www/daily-drift folders and the shared .env;
#   - the Reverb and queue services, the scheduler and a nightly database backup;
#   - ports 80 and 443 in Oracle's iptables rules, and a DuckDNS updater.
#
# Run it once on the server, as root:
#
#   curl -fsSLO https://raw.githubusercontent.com/yurivolkov21/Daily-Drift/main/deploy/setup-server.sh
#   sudo bash setup-server.sh
#
# It asks for the domain, the Gmail account that sends mail and the DuckDNS
# token, then runs without further questions. Running it again is safe: the
# .env, the database and the keys it made the first time are kept.
#
# Unattended runs take the answers from DAILY_DRIFT_DOMAIN,
# DAILY_DRIFT_MAIL_USERNAME, DAILY_DRIFT_MAIL_PASSWORD and
# DAILY_DRIFT_DUCKDNS_TOKEN (set it empty to skip DuckDNS).

set -euo pipefail

readonly APP_DIR=/var/www/daily-drift
readonly APP_USER=deploy
readonly PHP_VERSION=8.4
readonly PHP_FPM_SOCKET=/run/php/daily-drift.sock
readonly ENV_FILE=$APP_DIR/shared/.env

main() {
    require_root_on_ubuntu
    collect_answers

    add_swap_on_small_servers
    install_packages
    create_app_user_and_folders
    create_deploy_key
    write_env
    configure_php
    install_services
    configure_duckdns
    open_firewall
    configure_caddy

    print_next_steps
}

step() {
    printf '\n==> %s\n' "$*"
}

# ask NAME QUESTION [secret]: reads NAME from the terminal unless it is already set.
ask() {
    local name=$1 question=$2 secret=${3:-}

    if [[ -n ${!name+set} ]]; then
        return
    fi

    if [[ $secret == secret ]]; then
        read -rsp "$question: " "${name?}"
        echo
    else
        read -rp "$question: " "${name?}"
    fi
}

require_root_on_ubuntu() {
    if [[ $EUID -ne 0 ]]; then
        echo "Run this script as root: sudo bash $0" >&2
        exit 1
    fi

    if ! grep -q '^VERSION_ID="24.04"' /etc/os-release; then
        echo "This script is written for Ubuntu 24.04." >&2
        exit 1
    fi
}

collect_answers() {
    ask DAILY_DRIFT_DOMAIN "Domain name, for example dailydrift.duckdns.org"
    DAILY_DRIFT_DOMAIN=${DAILY_DRIFT_DOMAIN,,}

    if [[ ! $DAILY_DRIFT_DOMAIN =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
        echo "\"$DAILY_DRIFT_DOMAIN\" is not a domain name." >&2
        exit 1
    fi

    if [[ ! -f $ENV_FILE ]]; then
        ask DAILY_DRIFT_MAIL_USERNAME "Gmail address that sends Daily Drift's mail"
        ask DAILY_DRIFT_MAIL_PASSWORD "Its Gmail App password (hidden)" secret
    fi

    if [[ $DAILY_DRIFT_DOMAIN == *.duckdns.org ]]; then
        ask DAILY_DRIFT_DUCKDNS_TOKEN "DuckDNS token (hidden, leave empty to skip)" secret
    fi
}

add_swap_on_small_servers() {
    if (($(free -m | awk '/^Mem:/ { print $2 }') >= 2048)) || [[ -n $(swapon --show) ]]; then
        return
    fi

    step "Adding 2 GB of swap"

    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
}

install_packages() {
    step "Installing PHP $PHP_VERSION, Caddy and sqlite3"

    export DEBIAN_FRONTEND=noninteractive

    apt-get update -q
    apt-get install -yq software-properties-common debian-keyring debian-archive-keyring \
        apt-transport-https ca-certificates curl gnupg cron sqlite3 unzip

    if ! grep -rqs 'ondrej/php' /etc/apt/sources.list /etc/apt/sources.list.d; then
        LC_ALL=C.UTF-8 add-apt-repository -y ppa:ondrej/php
    fi

    if [[ ! -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg ]]; then
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
            | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
            > /etc/apt/sources.list.d/caddy-stable.list
        chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
    fi

    apt-get update -q
    apt-get install -yq caddy "php$PHP_VERSION-fpm" "php$PHP_VERSION-cli" "php$PHP_VERSION-bcmath" \
        "php$PHP_VERSION-curl" "php$PHP_VERSION-intl" "php$PHP_VERSION-mbstring" \
        "php$PHP_VERSION-readline" "php$PHP_VERSION-sqlite3" "php$PHP_VERSION-xml"
}

create_app_user_and_folders() {
    step "Creating the $APP_USER user and $APP_DIR"

    if ! id -u "$APP_USER" > /dev/null 2>&1; then
        useradd --create-home --shell /bin/bash "$APP_USER"
    fi

    install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$APP_DIR" "$APP_DIR/releases" "$APP_DIR/shared"
    install -d -o "$APP_USER" -g "$APP_USER" -m 700 "$APP_DIR/backups"

    runuser -u "$APP_USER" -- mkdir -p \
        "$APP_DIR/shared/database" \
        "$APP_DIR/shared/storage/app/private" \
        "$APP_DIR/shared/storage/app/public" \
        "$APP_DIR/shared/storage/framework/cache/data" \
        "$APP_DIR/shared/storage/framework/sessions" \
        "$APP_DIR/shared/storage/framework/views" \
        "$APP_DIR/shared/storage/logs"

    if [[ ! -f $APP_DIR/shared/database/database.sqlite ]]; then
        runuser -u "$APP_USER" -- touch "$APP_DIR/shared/database/database.sqlite"
    fi
}

create_deploy_key() {
    step "Creating the SSH key GitHub Actions deploys with"

    local ssh_dir=/home/$APP_USER/.ssh
    local key=$ssh_dir/github_actions

    install -d -o "$APP_USER" -g "$APP_USER" -m 700 "$ssh_dir"

    if [[ ! -f $key ]]; then
        runuser -u "$APP_USER" -- ssh-keygen -q -t ed25519 -N '' -C github-actions -f "$key"
    fi

    if ! grep -qsF "$(cut -d' ' -f2 "$key.pub")" "$ssh_dir/authorized_keys"; then
        echo "restrict $(cat "$key.pub")" >> "$ssh_dir/authorized_keys"
    fi

    chown "$APP_USER:$APP_USER" "$ssh_dir/authorized_keys"
    chmod 600 "$ssh_dir/authorized_keys"
}

write_env() {
    if [[ -f $ENV_FILE ]]; then
        step "Keeping the existing $ENV_FILE"
        return
    fi

    step "Writing $ENV_FILE"

    install -m 640 -o "$APP_USER" -g "$APP_USER" /dev/null "$ENV_FILE"

    cat > "$ENV_FILE" <<EOF
APP_NAME="Daily Drift"
APP_ENV=production
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=false
APP_URL=https://$DAILY_DRIFT_DOMAIN

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US
APP_MAINTENANCE_DRIVER=file

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=daily
LOG_DAILY_DAYS=14
LOG_LEVEL=info

DB_CONNECTION=sqlite
DB_DATABASE=$APP_DIR/shared/database/database.sqlite

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true

BROADCAST_CONNECTION=reverb
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME="$DAILY_DRIFT_MAIL_USERNAME"
MAIL_PASSWORD="${DAILY_DRIFT_MAIL_PASSWORD// /}"
MAIL_FROM_ADDRESS="$DAILY_DRIFT_MAIL_USERNAME"
MAIL_FROM_NAME="Daily Drift"

REVERB_APP_ID=$(shuf -i 100000-999999 -n 1)
REVERB_APP_KEY=$(openssl rand -hex 16)
REVERB_APP_SECRET=$(openssl rand -hex 32)

# Laravel sends broadcasts straight to Reverb on this server...
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http

# ...and Reverb only listens locally: Caddy passes the browsers' WebSockets on /app to it.
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
EOF
}

configure_php() {
    step "Configuring PHP-FPM"

    cat > "/etc/php/$PHP_VERSION/fpm/pool.d/daily-drift.conf" <<EOF
[daily-drift]
user = $APP_USER
group = $APP_USER
listen = $PHP_FPM_SOCKET
listen.owner = caddy
listen.group = caddy
listen.mode = 0660

pm = dynamic
pm.max_children = 8
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
pm.max_requests = 500
EOF

    rm -f "/etc/php/$PHP_VERSION/fpm/pool.d/www.conf"

    cat > "/etc/php/$PHP_VERSION/fpm/conf.d/99-daily-drift.ini" <<'EOF'
expose_php = Off
memory_limit = 256M
opcache.memory_consumption = 128
opcache.max_accelerated_files = 20000
EOF

    systemctl enable "php$PHP_VERSION-fpm"
    systemctl restart "php$PHP_VERSION-fpm"
}

install_services() {
    step "Installing the Reverb and queue services, the scheduler and the nightly backup"

    local unit
    for unit in reverb queue; do
        local description command
        if [[ $unit == reverb ]]; then
            description="Daily Drift Reverb server"
            command="reverb:start --no-interaction"
        else
            description="Daily Drift queue worker"
            command="queue:work --sleep=3 --tries=3 --max-time=3600"
        fi

        cat > "/etc/systemd/system/daily-drift-$unit.service" <<EOF
[Unit]
Description=$description
After=network.target
# Waits for the first release.
ConditionPathExists=$APP_DIR/current/artisan

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/current
ExecStart=/usr/bin/php$PHP_VERSION artisan $command
Restart=always
RestartSec=3
LimitNOFILE=10000

[Install]
WantedBy=multi-user.target
EOF
    done

    systemctl daemon-reload
    systemctl enable daily-drift-reverb daily-drift-queue

    cat > /etc/cron.d/daily-drift <<EOF
# Written by deploy/setup-server.sh.
* * * * * $APP_USER [ -f $APP_DIR/current/artisan ] && cd $APP_DIR/current && /usr/bin/php$PHP_VERSION artisan schedule:run > /dev/null 2>&1
30 3 * * * $APP_USER [ -x $APP_DIR/current/deploy/backup.sh ] && $APP_DIR/current/deploy/backup.sh daily > /dev/null 2>&1
EOF
    chmod 644 /etc/cron.d/daily-drift

    # Lets the deploy user reload PHP-FPM and restart the services, and nothing else.
    cat > /etc/sudoers.d/daily-drift <<EOF
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl reload php$PHP_VERSION-fpm, /usr/bin/systemctl restart daily-drift-reverb daily-drift-queue
EOF
    chmod 440 /etc/sudoers.d/daily-drift
    visudo -cqf /etc/sudoers.d/daily-drift
}

configure_duckdns() {
    if [[ -z ${DAILY_DRIFT_DUCKDNS_TOKEN:-} ]]; then
        return
    fi

    step "Pointing $DAILY_DRIFT_DOMAIN at this server"

    # curl reads the token from this file, so it never shows up in the process list.
    install -d -m 700 /etc/daily-drift
    install -m 600 /dev/null /etc/daily-drift/duckdns.curl
    printf 'url = "https://www.duckdns.org/update?domains=%s&token=%s&ip="\n' \
        "${DAILY_DRIFT_DOMAIN%.duckdns.org}" "$DAILY_DRIFT_DUCKDNS_TOKEN" > /etc/daily-drift/duckdns.curl

    echo '*/5 * * * * root curl -fsS --max-time 30 -K /etc/daily-drift/duckdns.curl > /dev/null 2>&1' \
        > /etc/cron.d/daily-drift-duckdns
    chmod 644 /etc/cron.d/daily-drift-duckdns

    local answer
    answer=$(curl -fsS --max-time 30 -K /etc/daily-drift/duckdns.curl || true)

    if [[ $answer != OK ]]; then
        echo "DuckDNS did not take the update (it answered \"${answer:-nothing}\"). Check the token." >&2
    fi
}

open_firewall() {
    step "Opening ports 80 and 443"

    local iptables_rules="" ufw_status=""
    if command -v iptables > /dev/null; then
        iptables_rules=$(iptables -S INPUT)
    fi
    if command -v ufw > /dev/null; then
        ufw_status=$(ufw status)
    fi

    # Oracle's Ubuntu images end the INPUT chain with a REJECT rule, so new rules go above it.
    if [[ $iptables_rules == *"-j REJECT"* ]]; then
        allow_port tcp 80
        allow_port tcp 443
        allow_port udp 443

        if command -v netfilter-persistent > /dev/null; then
            netfilter-persistent save
        fi
    elif [[ $ufw_status == *"Status: active"* ]]; then
        ufw allow 80/tcp
        ufw allow 443
    else
        echo "This server has no firewall rules to change."
    fi
}

allow_port() {
    local rule=(-p "$1" -m state --state NEW -m "$1" --dport "$2" -j ACCEPT)
    local reject_position

    if ! iptables -C INPUT "${rule[@]}" 2> /dev/null; then
        reject_position=$(iptables -L INPUT --line-numbers | awk '/REJECT/ && !found { found = $1 } END { print found }')
        iptables -I INPUT "$reject_position" "${rule[@]}"
    fi
}

configure_caddy() {
    step "Configuring Caddy for https://$DAILY_DRIFT_DOMAIN"

    cat > /etc/caddy/Caddyfile <<EOF
# Written by deploy/setup-server.sh. Caddy gets and renews the HTTPS certificate itself.
$DAILY_DRIFT_DOMAIN {
	root * $APP_DIR/current/public
	encode zstd gzip

	# Browsers open their Reverb WebSocket at /app.
	@reverb path /app /app/*
	reverse_proxy @reverb 127.0.0.1:8080

	php_fastcgi unix/$PHP_FPM_SOCKET
	file_server

	header {
		Strict-Transport-Security "max-age=31536000"
		Referrer-Policy strict-origin-when-cross-origin
		X-Content-Type-Options nosniff
		-Server
	}
}
EOF

    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
    systemctl enable caddy
    systemctl reload caddy || systemctl restart caddy
}

print_next_steps() {
    local reverb_key host_key
    reverb_key=$(grep '^REVERB_APP_KEY=' "$ENV_FILE" | cut -d= -f2)
    host_key=$(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub 2> /dev/null || true)

    step "Done. Next, in PowerShell, from the daily-drift folder on your computer:"

    cat <<EOF

ssh -i \$HOME\\.ssh\\daily_drift ubuntu@$DAILY_DRIFT_DOMAIN "sudo cat /home/$APP_USER/.ssh/github_actions" | gh secret set DEPLOY_SSH_KEY
gh variable set DEPLOY_HOST --body "$DAILY_DRIFT_DOMAIN"
gh variable set DEPLOY_KNOWN_HOSTS --body "$DAILY_DRIFT_DOMAIN $host_key"
gh variable set VITE_REVERB_APP_KEY --body "$reverb_key"
gh workflow run deploy

Keep a copy of APP_KEY from $ENV_FILE somewhere safe, such as a password
manager: a restored database needs it to read two-factor and webhook secrets.
EOF
}

main "$@"
