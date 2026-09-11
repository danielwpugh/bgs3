module.exports = {
  apps: [{
    name: 'beastgames',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/beastgames',
    env: {
      NODE_ENV: 'production',
    },
  }],
};

