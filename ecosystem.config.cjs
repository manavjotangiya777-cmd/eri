module.exports = {
    apps: [
        {
            name: 'it-crm-backend',
            script: 'src/index.js',
            cwd: './backend',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
                PORT: 5001
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5001
            }
        }
    ]
};
