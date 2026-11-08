CRACK THE BOX - NAPE 2026  -  OFFLINE EVENT PACKAGE  (WINDOWS)
================================================================

This runs the complete game on ONE laptop with NO internet at all:
all 100 NAPE boxes, the pictures, the Zoom In puzzles, sounds, mascot videos,
scoring and the admin page. The Original 60-question game is included too.

NOTHING needs installing. No Node.js, no npm, no GitHub, no VS Code, no Terminal.
The game engine is already inside this package (the "runtime" folder).
It needs: Windows 10 or 11 (64-bit) and Chrome or Edge.


PART 1 - COPY IT TO A USB STICK  (on the computer that has the package)
-----------------------------------------------------------------------
1. Plug in a USB stick with at least 1 GB free (any format is fine).
2. Copy the ZIP FILE  Crack-the-Box-NAPE-2026-Windows.zip  onto the USB stick.
   (Copy the zip - one single file. You do NOT need to unzip it first.)
3. Wait for the copy to finish, then eject the stick safely
   (click the USB icon in the taskbar > Eject).
4. Make a second USB stick the same way as a spare.


PART 2 - PUT IT ON THE EVENT LAPTOP  (do this the day before, no internet needed)
---------------------------------------------------------------------------------
1. Plug the USB stick into the event laptop.
2. Copy  Crack-the-Box-NAPE-2026-Windows.zip  from the stick onto the laptop's Desktop.
3. Right-click the zip on the Desktop and choose  "Extract All..."  then click Extract.
   A normal folder called  Crack-the-Box-NAPE-2026-Windows  appears.
   *** Do NOT double-click START-GAME from inside the zip. It must be extracted first. ***
4. Open that folder and double-click   START-GAME-Windows.bat
   - If Windows says "Windows protected your PC": click "More info", then "Run anyway".
   - If a firewall box appears, click Cancel (or "Private networks"). The game works either way.
5. A black window opens and your browser shows the game. The black window should say
   "Checked: all ... game files are present." If it says files are missing or damaged,
   extract the zip again.
6. TEST WITHOUT INTERNET: turn the laptop's Wi-Fi OFF (and unplug any network cable),
   press F5 in the browser, and play one box with a picture. It must all still work.
7. Always use the SAME browser (Chrome or Edge). Do not use a private / incognito window and do
   not clear the browser's history or data: the game keeps its score inside the browser.

The package can be copied to ANY other laptop the same way and runs on its own there.
(Each laptop keeps its own score - scores do not travel between laptops.)


PART 3 - AT THE EVENT  (no internet needed)
-------------------------------------------
1. Plug the laptop into power. Turn off sleep and the screen saver:
   Settings > System > Power > "Screen and sleep" > set every box to "Never".
   Close other programs and switch off notifications.
2. Open the folder and double-click  START-GAME-Windows.bat
   *** LEAVE THE BLACK WINDOW OPEN for the whole event. It IS the game. ***
   (You can minimise it. If you close it, the game stops.)
3. Press F11 to fill the projector screen.
4. SOUND CHECK: click once on the game, open a box and listen on the venue speakers.
   Browsers only start sound after the first click.
5. The wall should show exactly 100 boxes. To start the audience from zero use the
   facilitator panel > Reset game.
6. Do NOT use the Admin page during the live game. Hiding, activating or switching
   event resets the score.


IF SOMETHING GOES WRONG
-----------------------
* Browser closed or crashed?  Open it again and go to  http://localhost:3000
  Your score is still there. (Keep the black window running.)
* Black window closed by accident?  Double-click START-GAME-Windows.bat again, then refresh
  the browser (F5). Your score is kept.
* Laptop restarted?  Same: double-click START-GAME-Windows.bat, then open the game.
* "Port 3000 is being used by another program":  close that program, or restart the laptop.
* "The game engine could not start":  extract the zip again (the "runtime" folder must be there);
  if antivirus removed runtime\node.exe, restore it.
* "Files are missing or damaged":  extract the zip again from the USB stick.
* No sound:  click on the game once, check the laptop volume and that the browser tab is not muted.
* Page won't load:  check the black window is still open and the address is exactly
  http://localhost:3000


SWITCHING GAMES
---------------
The game opens as NAPE 2026 (exactly 100 boxes).
To play the Original 60-question game: open  http://localhost:3000/admin/questions
choose "Original Crack the Box", confirm "Switch event", then go back to the game.
Switch back to "NAPE 2026" the same way. Nothing is ever deleted.


STOPPING
--------
When the event is over, just close the black window.


5-MINUTE CHECK TO DO ON THE ACTUAL LAPTOP
-----------------------------------------
[ ] Extract the zip and double-click START-GAME-Windows.bat - the game opens
[ ] Black window says "all ... game files are present"
[ ] Wi-Fi OFF, press F5 - the game still loads with 100 boxes
[ ] Open a Zoom In box (e.g. box 7): the picture shows, "Zoom Out" works, "Hint" works
[ ] Sound plays on the venue speakers (suspense + right/wrong sounds, mascot video appears)
[ ] F11 fills the projector screen and nothing is cut off
[ ] Close the black window, start it again, refresh - your score is still there


GOOD TO KNOW
------------
* The game only works on this laptop (address http://localhost:3000). It cannot be reached
  from other devices, by design - the Admin page has no password.
* Always use http://localhost:3000 - the score is saved per address, so a different address
  would look like a fresh game.
