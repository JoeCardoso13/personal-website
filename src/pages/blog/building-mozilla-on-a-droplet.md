---
layout: ../../layouts/BlogPost.astro
title: "Leveraging The Cloud To Overcome Hardware Limitations"
date: "November 15, 2025"
description: "Facing challenges due to low hardware specs, I SSHed into a remote VPS and used those rented computational resources to meet my needs."
---

## Intro

By November 2025 [I started working](/blog/contributing-to-firefox) on some bugs from the [Mozilla Firefox codebase](https://bugzilla.mozilla.org/). It's been quite an interesting journey, where I was able to promptly tackle real, highly difficult software engineering problems. One challenge came from my own hardware limitations. Turned out relying on a low-end, budget-friendly, fragile little laptop for this work was threatening to hamper the whole experience. But then I turned it around, into another opportunity to learn powerful skills.

## The Challenge

When editing a large and complex codebase such as Mozilla Firefox, it is quite useful to be able to run some testing on your own. There is usually a test suite already in place for the section of the code you're modifying, and by running these you can neatly verify if your changes didn't break anything that was working before, i.e. regression testing.

When I began tackling my first bugs, I didn't have [commit level 1](https://www.mozilla.org/en-US/about/governance/policies/commit/access-policy/) clearance. This meant I wasn't able to do a [try push](https://firefox-source-docs.mozilla.org/tools/try/index.html) and use Mozilla's CI testing system. I'd have to use the testing that was already built into the codebase.

According to the [official requirements](https://firefox-source-docs.mozilla.org/setup/linux_build.html), 4Gb of RAM is the bare minimum for an artifact build, but 8Gb recommended (at the time of this writing). It doesn't explicitly give the requirements for a non-artifact build, but I'd extrapolate - based on experience - 8Gb as the bare minimum and 16Gb recommended.

## Artifact vs Non-artifact Build

Given that Mozilla Firefox's codebase is so vast and hardware intensive, the developers provide a lighter [artifact version](https://firefox-source-docs.mozilla.org/contributing/build/artifact_builds.html) of it. The difference is that this version comes with all C++ code pre-compiled, whereas in the non-artifact version the C++ is compiled locally, during the build. It is significantly faster to download all C++ already compiled - the artifacts - than to compile them locally during the build. 

However, for those making changes to C++ code there's no way around the non-artifact version. I realized this very concretely, in practice, as I wasn't able to test my C++ code changes with the artifact build. The downloaded artifacts - compiled C++ - obviously didn't account for my changes and the only way to have that would be to compile locally.


## Digital Ocean's Droplets

Personally, at this time, it'd be much more convenient to **rent** powerful computing resources than to outright **buy** them, i.e. to upgrade my hardware. The pricing from Digital Ocean's Virtual Private Servers (droplets) is geared towards a different use-case, and, therefore, quite affordable if running for several hours, or even for a few days.

There's a myriad of choices for droplet specs, and I chose the cheapest with shared CPU and 16Gb of RAM. Upon creating it, you're immediately given its IP that you can SSH into it. You ought to have provided your public SSH key to DO already, probably when creating your account. If you don't have, or want to generate a new one, run `ssh-keygen` in your terminal. You might already have one at `~/.ssh/id_rsa.pub` though. Some people prefer having multiple SSH keys for different services (like GitHub), for increased security.

## How To Operate Remotely Via SSH

You first log into the server by running `ssh root@ip_address` where `ip_address` refers to the IP address of the VPS obtained previously. It's good to add a user so you don't need to keep using `root`. To do so, run `adduser name` where `name` is the name of the user you wish to create - you'll be asked to provide a password. This newly created user, let's call it `name`, will need to use `sudo` commands, so you run `usermod -aG sudo name`. And then copy the SSH key from the root user to the name user by running `rsync --archive --chown=name:name ~/.ssh /home/name`. Now, to check things, you should log out of the server and back into it through your `name` user with `ssh name@ip_address`, and run a `sudo` command such as `sudo apt update`.

If anything, just for the sake of keeping the habit of good SSH hygiene, you may follow the rest of this paragraph. Configure your firewall by (first!) enabling SSH with `sudo ufw allow OpenSSH` and then turning on the firewall with `sudo ufw enable`. Be careful as you can get locked out of your server if you don't perform these in this order. Now disable the root account by editing the config file at `/etc/ssh/sshd_config`. In this file, go to `PermitRootLogin` and substitute `yes` with `no`. Finally, restart the SSH service: `sudo service SSH restart`.

## Connection Persistence

The SSH connection by itself is not going to be sufficient for our purposes here. When we use SSH to connect to our VPS, the remote kernel creates PTY (Pseudo-TeletYpe) as our terminal interface, and any process we run is attached to it. The problem is that something like installing a [non-artifact Mozilla Firefox](https://firefox-source-docs.mozilla.org/contributing/build/artifact_builds.html) is a process that can take several hours, and it's very common for the SSH connection to drop at some point on such a timeframe. When this happens the VPS' kernel kills every process attached to the defunct PTY, including the installation.

**TMUX** can keep the installation process alive. It is like a terminal that runs as a server process detached from the SSH session. This means you can keep the installation running in the background as you please. If the SSH connection drops all you need to do is hook back into your TMUX session, no different than if you had exited deliberately.

**TMUX** is usually included in the VPS by default. Here are some commands that I used often:
```bash
tmux new -s permconn          # create new session named "permconn"
tmux attach -t permconn       # reattach to session (or just: tmux a)
tmux detach                   # or Ctrl+b, d to detach from session (keeps it running)
tmux copy-mode                # or Ctrl+b, [ to enter scroll mode (q or Escape to exit)
```
## Headless Testing

The most gnarly part of testing in an environment like a VPS is that Firefox will need a lot of runtime dependencies that probably won't come pre-installed by default. For brevity, I'll share the command I used for the salad-package installment that enabled me to run headless tests on the VPS:
```bash
sudo apt-get install -y xvfb \
  libgtk-3-0 libdbus-glib-1-2 libxt6 libpci3 \
  libasound2t64 libpulse0 libgl1 libglib2.0-0 libx11-xcb1 \
  libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 \
  libnss3 libcups2 libxss1 libxrandr2 libgbm1 libdrm2 \
  libatk1.0-0 libatk-bridge2.0-0 libcairo2 libpango-1.0-0
```

And here's the breakdown of what they mean:

<a id="packages-table"></a>

  | Package                                                                         | Purpose                                                                      |
  |---------------------------------------------------------------------------------|------------------------------------------------------------------------------|
  | xvfb                                                                            | X Virtual Frame Buffer — fake display for running GUI apps without a monitor |
  | libgtk-3-0                                                                      | GTK3 — Firefox's UI toolkit on Linux                                         |
  | libdbus-glib-1-2                                                                | D-Bus messaging (inter-process communication)                                |
  | libxt6, libx11-xcb1                                                             | X Window System libraries                                                    |
  | libxcomposite1, libxcursor1, libxdamage1, libxi6, libxtst6, libxss1, libxrandr2 | Various X11 extensions (compositing, cursors, input, screen saver, etc.)     |
  | libasound2t64, libpulse0                                                        | Audio (ALSA + PulseAudio)                                                    |
  | libgl1, libgbm1, libdrm2                                                        | Graphics/OpenGL/GPU buffer management                                        |
  | libnss3                                                                         | Network Security Services (SSL/TLS)                                          |
  | libcups2                                                                        | Printing support                                                             |
  | libatk1.0-0, libatk-bridge2.0-0                                                 | Accessibility toolkit                                                        |
  | libcairo2, libpango-1.0-0                                                       | 2D graphics and text rendering

Now to run the tests all I needed was to prepend the commands with `xvfb-run`. So for browser tests, for instance, I'd run: `xvfb-run ./mach test accessible/tests/browser/states/` and for mochitests: `xvfb-run ./mach test accessible/tests/mochitest/table/`.

## A Rudimentary CI/CD

The habit of building Firefox, running tests, editing the code, building and testing again created a nice little workflow that in many ways feels like an embryonic CI/CD. I'd edit code on my **local machine** - using the **artifact build**, and then leverage git version controlling to sync the VPS. In the VPS I'd use the **non-artifact build**.

Running `git diff main..current-branch > changes.diff` locally creates a `changes.diff` file containing the code differences that `git` can see. It's important to rebase the `current-branch` so we don't end up catching other code changes than the ones we made ourselves. You can copy/paste this `changes.diff` file into your remote codebase however you like, then sync it by running `git apply changes.diff`. Make sure the remote and local `main` branches are identical - `git pull` can update either. 

With the remote and local codebases synced, run `./mach build` on the remote, non-artifact one and run your tests. More often than not, you'll need to repeat this. Easy peasy, just make sure you run `git restore . && git clean -fd` on the VPS to have the codebase back to its original state.

In other words, repeat these steps:

1. Edit codebase, artifact version (locally)
2. Run `git diff main..current-branch > changes.diff` (locally)
3. Create `changes.diff` with same contents (remotely)
4. Run `git apply changes.diff` (remotely)
5. Run `./mach build` (remotely)
6. Run testing (remotely)
7. Run `git restore . && git clean -fd` (remotely)

Iterate until you make it, using `git pull` profusely, both in your local and remote codebases.

## Takeaways

Beyond the financial aspect, this initiative was a sort of proof-of-concept. I wanted to check if it'd be possible/feasible to use my personal laptop as a sort of meta-machine, running more powerful computational resources elsewhere through virtual connections. I love the feeling of controlling a remote server through the terminal and this experience enhanced my abilities to do that ad hoc.
