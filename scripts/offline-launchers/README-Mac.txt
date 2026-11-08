CRACK THE BOX - NAPE 2026  -  OFFLINE EVENT PACKAGE  (MAC)
===========================================================

This runs the complete game on ONE laptop with NO internet at all:
all 100 NAPE boxes, the pictures, the Zoom In puzzles, sounds, mascot videos,
scoring and the admin page. The Original 60-question game is included too.

NOTHING needs installing. No Node.js, no npm, no GitHub, no VS Code, no Terminal commands.
The game engine is already inside this package (the "runtime" folder), for both Apple-chip
and Intel Macs. It needs: macOS 11 (Big Sur) or newer, and Chrome, Edge or Safari.


PART 1 - COPY IT TO A USB STICK  (on the computer that has the package)
-----------------------------------------------------------------------
1. Plug in a USB stick with at least 1 GB free.
2. Copy the ZIP FILE  Crack-the-Box-NAPE-2026-Mac.zip  onto the USB stick.
   (Copy the zip - one single file. You do NOT need to unzip it first.)
3. When the copy is finished, eject the stick (drag it to the Bin / click the eject icon).
4. Make a second USB stick the same way as a spare.
   Tip: copy from a USB stick, not by email or download - that avoids extra security messages.


PART 2 - PUT IT ON THE EVENT LAPTOP  (do this the day before, no internet needed)
---------------------------------------------------------------------------------
1. Plug the USB stick into the event laptop.
2. Drag  Crack-the-Box-NAPE-2026-Mac.zip  from the stick onto the Desktop.
3. Double-click the zip. A folder called  Crack-the-Box-NAPE-2026-Mac  appears.
4. Open that folder and double-click   START-GAME-Mac.command
   FIRST TIME ONLY - if macOS says it "cannot be opened" or is from an unidentified developer:
     - Right-click (or Control-click) START-GAME-Mac.command, choose Open, then click Open.
     - Or: Apple menu > System Settings > Privacy & Security, scroll down, click "Open Anyway".
5. A Terminal window opens and your browser shows the game. The Terminal window should say
   "Checked: all ... game files are present." If it says files are missing or damaged,
   unzip again from the USB stick.
6. TEST WITHOUT INTERNET: turn the laptop's Wi-Fi OFF, refresh the browser page
   (Command + R), and play one box with a picture. It must all still work.
7. Always use the SAME browser. Do not use a private window and do not clear the browser's history
   or website data: the game keeps its score inside the browser.

The package can be copied to ANY other Mac the same way and runs on its own there.
(Each laptop keeps its own score - scores do not travel between laptops.)


PART 3 - AT THE EVENT  (no internet needed)
-------------------------------------------
1. Plug the laptop into power. Turn off sleep: System Settings > Lock Screen (and Battery) >
   set "Turn display off" to Never. Close other apps and switch on Do Not Disturb.
2. Open the folder and double-click  START-GAME-Mac.command
   *** LEAVE THE TERMINAL WINDOW OPEN for the whole event. It IS the game. ***
   (You can minimise it. If you close it, the game stops.)
3. Click the full-screen button in the game (or press Control + Command + F) to fill the projector.
4. SOUND CHECK: click once on the game, open a box and listen on the venue speakers.
   Browsers only start sound after the first click.
5. The wall should show exactly 100 boxes. To start the audience from zero use the
   facilitator panel > Reset game.
6. Do NOT use the Admin page during the live game. Hiding, activating or switching
   event resets the score.


IF SOMETHING GOES WRONG
-----------------------
* Browser closed or crashed?  Open it again and go to  http://localhost:3000
  Your score is still there. (Keep the Terminal window running.)
* Terminal window closed by accident?  Double-click START-GAME-Mac.command again, then refresh
  the browser (Command + R). Your score is kept.
* Laptop restarted?  Same: double-click START-GAME-Mac.command, then open the game.
* "Port 3000 is being used by another program":  close that program, or restart the Mac.
* "The game engine could not start":  unzip again from the USB stick (the "runtime" folder must
  be there) and follow the Privacy & Security step above.
* "Files are missing or damaged":  unzip again from the USB stick.
* No sound:  click on the game once, check the Mac's volume and that the browser tab is not muted.
* Page won't load:  check the Terminal window is still open and the address is exactly
  http://localhost:3000


SWITCHING GAMES
---------------
The game opens as NAPE 2026 (exactly 100 boxes).
To play the Original 60-question game: open  http://localhost:3000/admin/questions
choose "Original Crack the Box", confirm "Switch event", then go back to the game.
Switch back to "NAPE 2026" the same way. Nothing is ever deleted.


STOPPING
--------
When the event is over, just close the Terminal window.


5-MINUTE CHECK TO DO ON THE ACTUAL LAPTOP
-----------------------------------------
[ ] Unzip and double-click START-GAME-Mac.command - the game opens
[ ] Terminal says "all ... game files are present"
[ ] Wi-Fi OFF, refresh - the game still loads with 100 boxes
[ ] Open a Zoom In box (e.g. box 7): the picture shows, "Zoom Out" works, "Hint" works
[ ] Sound plays on the venue speakers (suspense + right/wrong sounds, mascot video appears)
[ ] Full screen fills the projector and nothing is cut off
[ ] Close the Terminal window, start it again, refresh - your score is still there


GOOD TO KNOW
------------
* The game only works on this laptop (address http://localhost:3000). It cannot be reached
  from other devices, by design - the Admin page has no password.
* Always use http://localhost:3000 - the score is saved per address, so a different address
  would look like a fresh game.
