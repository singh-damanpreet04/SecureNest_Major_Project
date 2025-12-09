# Notification Sounds

## Required File

You need to add a notification sound file named `notification.mp3` in this directory.

## Recommended Sound Characteristics

- **Duration**: 1-2 seconds
- **Format**: MP3
- **Volume**: Moderate (not too loud)
- **Style**: Pleasant notification tone (similar to WhatsApp or Messenger)

## Where to Get Sounds

1. **Free Sources**:
   - [Freesound.org](https://freesound.org/) - Search for "notification" or "message"
   - [Zapsplat.com](https://zapsplat.com/) - Professional sound effects
   - [Pixabay](https://pixabay.com/sound-effects/) - Free sound effects

2. **Quick Option**:
   - Use any short notification sound from your phone
   - Convert to MP3 if needed

## File Structure

```
public/
  sounds/
    notification.mp3  <- Add this file
    README.md        <- This file
```

## Testing

After adding the sound file, test the notification system by:
1. Opening two browser windows with different users
2. Sending a message from one to the other
3. The notification should appear with sound
