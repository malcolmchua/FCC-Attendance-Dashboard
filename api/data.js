module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const expected = process.env.DASHBOARD_PASSWORD;
  const given = (req.body && req.body.password) || '';
  if (!expected) {
    res.status(500).json({ error: 'No team password is set on this deployment.' });
    return;
  }
  if (given !== expected) {
    res.status(401).json({ error: 'Wrong password.' });
    return;
  }

  const feed = process.env.ATTENDANCE_FEED_URL;
  if (!feed) {
    res.status(500).json({ error: 'The feed address is not set on this deployment.' });
    return;
  }

  // Describes the stored address without ever revealing it.
  const shape = feed.startsWith('https://script.google.com/')
    ? 'looks right'
    : 'WRONG — it starts with "' + feed.slice(0, 12) + '"';

  try {
    const upstream = await fetch(feed, { redirect: 'follow' });
    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      res.status(502).json({
        error: 'Feed did not return data. Address ' + shape +
               ', length ' + feed.length +
               ', HTTP ' + upstream.status +
               '. It replied: ' + text.slice(0, 120)
      });
      return;
    }

    if (data.error) {
      res.status(502).json({ error: 'The feed refused: ' + data.error });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Could not reach the feed. Address ' + shape + '. ' + err.message });
  }
};
