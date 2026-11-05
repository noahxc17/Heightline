# Heightline website

A static website with no build step and no server. Measurements, routines and photos stay in each visitor's browser.

## Launch steps

These need your own accounts, so you'll do them yourself.

### 1. Finish the privacy notice

In `privacy.html`, replace the two placeholders with your name, contact email and the date. Then read the whole page and make sure it's true for how you're running the site. Get it checked by a solicitor if you can.

### 2. Put the code on GitHub

1. Create a free account at github.com.
2. Create a new **private** repository called `heightline`.
3. On the empty repository page, choose **uploading an existing file**.
4. Drag in everything **inside** this folder, including `_headers`, then choose **Commit changes**.

### 3. Host it on Cloudflare Pages

Use Cloudflare Pages because it reads the security rules in `_headers` as they are.

1. Create a free account at cloudflare.com.
2. Go to **Workers & Pages**, then **Create**, then the **Pages** option, and connect your GitHub repository.
3. Set the framework preset to **None**, leave the build command empty, and set the output directory to `/`.
4. Choose **Save and Deploy**. You'll get a free `.pages.dev` link.
5. Leave Cloudflare Web Analytics off, because the privacy notice says the site doesn't use analytics. If you turn it on, the site's security rules and privacy notice would both need changing.

Cloudflare's menus change from time to time, so the button names might be slightly different.

### 4. Test the live link

On a real iPhone and a real Android phone, check that you can:

- Get a prediction and switch between cm and feet
- Save a measurement and tick routine tasks, then refresh
- Add a photo taken on that phone, then refresh
- Save a Wrapped image
- Download a backup, delete your data, then restore the backup

### 5. Add your web address

1. Check the name isn't already in use, including as a trademark.
2. Buy the address, for example through Cloudflare or another registrar.
3. In your Cloudflare Pages project, open **Custom domains** and add it.

## Before you share it widely

- Test the height rules against real adult heights.
- Check the adult height percentages in `app.js` (`adultShare`) against a published source. They came from memory.
- Add back advice about seeing a GP if someone is worried about their growth.
- Keep the wording that estimates are untested and that the routine won't make anyone taller.
- Don't add accounts, payments, a community or analytics without updating the privacy notice and getting advice. They change your legal duties.

## Updating the site

Change the files on GitHub, and Cloudflare will publish the update automatically.
