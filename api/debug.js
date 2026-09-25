module.exports = (req, res) => {
  const url = process.env.DATABASE_URL;
  res.status(200).json({
    hasDatabaseUrl: !!url,
    length: url ? url.length : 0,
    startsWithPostgres: url ? url.startsWith('postgresql://') || url.startsWith('postgres://') : false,
    // Never log the password — show only the host
    host: url ? (url.match(/@([^/:?]+)/) || [])[1] || 'unparseable' : null,
    hasAdminUser: !!process.env.ADMIN_USER,
    hasAdminPass: !!process.env.ADMIN_PASS,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
};
