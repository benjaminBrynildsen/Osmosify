# Osmosify Mobile App Setup

This guide covers building Osmosify as a native mobile app using Capacitor.

## Overview

Osmosify uses **Capacitor** to wrap the React web app as a native iOS/Android application. This provides:
- Native performance and UI feel
- Offline text-to-speech (no API calls)
- Access to device camera for photo uploads
- App store distribution

## Prerequisites

### iOS Development
- macOS with Xcode installed
- Apple Developer account (for device testing/app store)
- iOS Simulator (included with Xcode)

### Android Development
- Android Studio
- Android SDK
- Java JDK 17+

## Quick Start

### 1. Build the Web App

```bash
npm run build
```

This creates the `dist/` folder that Capacitor uses as the web content.

### 2. Sync Native Platforms

```bash
npx cap sync
```

This copies the web build to iOS/Android projects and installs native plugins.

### 3. Open in IDE

**iOS:**
```bash
npx cap open ios
```

**Android:**
```bash
npx cap open android
```

### 4. Run on Device/Simulator

From Xcode or Android Studio, select your target device and click Run.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run mobile:build` | Build web app and sync to native platforms |
| `npm run mobile:ios` | Build and open Xcode |
| `npm run mobile:android` | Build and open Android Studio |
| `npm run mobile:copy` | Quick copy of web build without full sync |

## Native Text-to-Speech

The app now uses **native device TTS** instead of cloud APIs:
- **iOS**: Uses AVSpeechSynthesizer
- **Android**: Uses TextToSpeech engine
- **Web fallback**: Browser SpeechSynthesis API

### Usage

```typescript
import { nativeTTS, speak, stopSpeaking } from '@/lib/nativeSpeech';

// Speak a word
await speak('hello');

// Speak with options
await nativeTTS.speak({
  text: 'hello world',
  rate: 0.9,      // 0.1 - 2.0
  pitch: 1.0,     // 0.5 - 2.0
  volume: 1.0,    // 0.0 - 1.0
});

// Stop speaking
await stopSpeaking();
```

## Project Structure

```
Osmosify/
├── android/          # Android native project (auto-generated)
├── ios/              # iOS native project (auto-generated)
├── client/
│   └── src/
│       └── lib/
│           └── nativeSpeech.ts  # Native TTS service
├── capacitor.config.ts          # Capacitor configuration
└── package.json
```

## Important Notes

### Do Not Edit Native Projects Directly

Files in `ios/` and `android/` are auto-generated. To make changes:
1. Edit web code in `client/`
2. Rebuild with `npm run mobile:build`
3. Native projects will be updated

### Plugin Installation

When adding new Capacitor plugins:
```bash
npm install @capacitor/plugin-name
npx cap sync
```

### Live Reload (Development)

For faster development with live reload:
```bash
npm run dev
# In another terminal:
npx cap run ios --livereload --external
```

## Building for Production

### iOS App Store

1. Open `ios/App/App.xcworkspace` in Xcode
2. Set your Team and Bundle Identifier
3. Product → Archive
4. Distribute App via App Store Connect

### Google Play Store

1. Open `android` folder in Android Studio
2. Build → Generate Signed Bundle/APK
3. Create/upload signing key
4. Upload to Google Play Console

## Live Reload Development

After the initial Xcode build and install on your device, use live reload for faster iteration:

### 1. Get Your Computer's IP Address
```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Use the WiFi IP (e.g., 192.168.1.xxx)
```

### 2. Update capacitor.config.ts
Replace `YOUR_IP` in `capacitor.config.ts` with your actual IP address.

### 3. Run Live Reload
```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run with live reload
npm run mobile:live
```

Changes you make to the web code will automatically reload on your device.

**Note:** Live reload is for development only. Remove it before App Store submission.

---

# App Store Submission Guide

## Prerequisites

- **Apple Developer Account** ($99/year) — enroll at developer.apple.com
- **Mac with Xcode** (latest version recommended)
- **Physical iOS device** for testing (required for some features)

---

## Step 1: Prepare for Production

### 1.1 Disable Live Reload
Edit `capacitor.config.ts` and remove or comment out the live reload server URL:
```typescript
server: {
  androidScheme: 'https',
  iosScheme: 'https',
  // Remove this for production:
  // url: process.env.CAPACITOR_LIVE_RELOAD === 'true' ? 'http://YOUR_IP:3000' : undefined,
  // cleartext: process.env.CAPACITOR_LIVE_RELOAD === 'true',
},
```

### 1.2 Configure App Icons & Splash Screens

Generate icons for all required sizes. Options:

**Option A: Use Capacitor Assets Plugin**
```bash
npm install -g cordova-res
# Create resources/icon.png (1024x1024) and resources/splash.png (2732x2732)
cordova-res ios --skip-config --copy
```

**Option B: Manual via Xcode**
- Open `ios/App/App.xcworkspace`
- Select `App` project → `App` target → `General` tab
- Under `App Icons and Launch Images`, drag your icon set

### 1.3 Set Bundle Identifier & Version

In Xcode:
1. Select `App` project → `App` target → `General` tab
2. **Bundle Identifier:** `com.osmosify.app` (or your chosen ID)
3. **Version:** Start with `1.0.0`
4. **Build:** Increment with each submission (1, 2, 3...)

### 1.4 Configure Signing

1. Connect your Apple Developer account:
   - Xcode → Preferences → Accounts → Add your Apple ID

2. In project settings:
   - Select `App` target → `Signing & Capabilities`
   - Check "Automatically manage signing"
   - Select your Team

### 1.5 Build Production Version
```bash
npm run mobile:build
```

---

## Step 2: App Store Connect Setup

### 2.1 Create App Record
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select "My Apps" → Click "+" → "New App"
3. Fill in:
   - **Platforms:** iOS
   - **Name:** Osmosify
   - **Primary Language:** English
   - **Bundle ID:** com.osmosify.app
   - **SKU:** osmosify-001 (unique identifier)
   - **User Access:** Full access

### 2.2 Prepare App Information

**Required Assets:**
- **App Icon:** 1024x1024 PNG (no transparency)
- **Screenshots:** iPhone 6.7", 6.5", 5.5" and iPad Pro (3 sets minimum)
- **App Preview Video:** Optional but recommended (15-30 seconds)

**Required Text:**
- **Subtitle:** (30 chars max) — "Kids Reading & Flashcards"
- **Description:** (up to 4000 chars) — Feature list, how it helps kids learn
- **Keywords:** reading, phonics, flashcards, kids, education, vocabulary
- **Support URL:** Your website or support page
- **Marketing URL:** Optional
- **Privacy Policy URL:** Required — can use free generator like [App Privacy Policy Generator](https://app-privacy-policy-generator.firebaseapp.com/)

---

## Step 3: TestFlight (Beta Testing)

### 3.1 Archive & Upload
1. In Xcode: Select "Any iOS Device" as target
2. Product → Archive
3. Wait for archive to finish
4. Click "Distribute App" → "App Store Connect" → "Upload"
5. Follow prompts, keep "Include bitcode" unchecked (deprecated)

### 3.2 Wait for Processing
- Takes 10-30 minutes
- Check App Store Connect → TestFlight tab
- You'll get an email when ready

### 3.3 Internal Testing
1. Add testers in App Store Connect → Users and Access
2. TestFlight app (on iPhone) will show your app
3. Install and test thoroughly

### 3.4 External Testing (Optional)
- Add external testers via TestFlight → New Group
- Requires App Review approval for beta (lighter review)

---

## Step 4: Submit for Review

### 4.1 Complete App Store Listing
In App Store Connect:
1. **App Information** → Fill all required fields
2. **Pricing and Availability** → Set price (free or paid)
3. **App Privacy** → Answer privacy questions (data collection)
4. **iOS App** → Select the build you uploaded

### 4.2 Review Information
- **Contact Info:** Your name, email, phone
- **Demo Account:** If app requires login, provide test credentials
- **Notes:** Any special instructions for reviewers

### 4.3 Submit
- Click "Submit for Review"
- Typical review time: 1-2 days
- You'll get email updates on status

---

## Common Rejection Reasons & Fixes

| Issue | Fix |
|-------|-----|
| Missing demo account | Create test child profile, provide login in Review Notes |
| "Kids Category" requirements | Ensure no ads, no in-app purchases without parental gate, COPPA compliant |
| Incomplete functionality | Make sure all buttons work, no placeholder text |
| Performance issues | Test on older devices (iPhone 8+) |
| Privacy policy missing | Generate one, link in App Store Connect |
| Sign-in required but no Apple Sign-In | Add "Sign in with Apple" if you have other sign-in methods |

---

## Post-Launch

### Updates
1. Update version in `capacitor.config.ts` and Xcode
2. Build new archive
3. Upload to App Store Connect
4. Submit for review

### Analytics
- Connect App Store Connect analytics
- Consider adding Firebase Analytics for detailed usage

---

## Troubleshooting

### "dist directory not found"
Run `npm run build` first, then `npx cap sync`.

### Plugin not working on native
Make sure to run `npx cap sync` after installing any plugin.

### iOS build errors
- Clean build folder: Product → Clean Build Folder
- Update pods: `cd ios/App && pod install`

### Android build errors
- Sync project with Gradle files
- Check SDK versions in `build.gradle`

### Archive upload fails
- Check your Apple Developer account is active
- Verify bundle ID matches exactly
- Try "Validate App" before "Distribute App"

---

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Text-to-Speech Plugin](https://github.com/capacitor-community/text-to-speech)
- [Capacitor Camera Plugin](https://capacitorjs.com/docs/apis/camera) (for native photo capture)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
