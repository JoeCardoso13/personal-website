---
layout: ../../layouts/BlogPost.astro
title: "Leveraging The Cloud To Overcome Hardware Limitations"
date: "November 15, 2025"
description: "Facing challenges due to low hardware specs, I SSHed into a remote VPS and used those rented computational resources to meet my needs."
---

## Intro

By November 2025 [I started working]() on some bugs from the Mozilla Firefox codebase. It's been quite a journey, where I surprised myself with the capacity to promptly tackle real, highly difficult software engineering problems. One facet of these challenges came from my own hardware limitations. It turned into another great chance to learn powerful, transferrable skills.

## The Challenge

When editing a large and complex codebase such as Mozilla Firefox, it is quite useful to be able to run some testing. There are usually a test suite already in place for the section of the code you're modifying. By running these you can neatly verify if your changes didn't break anything that was already built, i.e. do some regression testing.

While beginning a journey as a Mozilla Bughunter, you're relying on your local machine to run any testing you might need since, at first, you likely won't have [commit level 1]() access. Even without access to the remote, automated Mozilla Firefox's CI testing, you can use all the testing already built into the codebase - as long as your hardware can handle it.

(Explain the whole issue with C++ changes and non-artifact builds)

Mention that you have a low-end, budget-friendly, fragile little laptop with only 4Gb of RAM.

## Digital Ocean's Droplets

The pricing from Digital Ocean's Virtual Private Servers (droplets) is geared towards a different use-case, and therefore quite affordable if running for several hours, or even for a few days. For this reason, it wasn't worth considering alternatives, maybe less opinionated ones, such as AWS' EC2 or Azure's VMs. Digital Ocean's droplets are already simple enough, and ultra-cheap for this use-case. 

(Give some specifics about pricing vs specs, mention that after selecting an option and going with it DO will give you the IP of your new droplet)

Mention that upon creating your account you can/should provide your public SSH to DO. If you don't have, or want to generate a new one, you can do so with `ssh-keygen`. You might already have one at `~/.ssh/id_rsa.pub` that you can use. Some people prefer having multiple SSH keys for different services (like GitHub), for increased security.

## How To Operate Remotely Via SSH

You first get into the server with `ssh root@ip_address` where `ip_address` refers to the IP address of the VPS obtained previously (if you set a passphrase along with your ssh key you’ll be requested it). It's good to add a user so you don't need to keep using `root`. To do so run `adduser name` where `name` is the name of the user you wish to create - you'll be asked to provide a password. This newly created user, let's call it `name`, will need to use `sudo` commands, so you run `usermod -aG sudo name`. And finally copy the SSH key from the root user to the name user by running `rsync --archive --chown=name:name ~/.ssh /home/name`. Now you should log out of the server and back into it through your `name` user with `ssh name@ip_address`, and run a `sudo` command such as `sudo apt update` to test.

If anything, for keeping the habit of good SSH hygene you may do the following. Configure your firewall by (first!) enabling SSH with `sudo ufw allow OpenSSH` and then turning on the firewall with `sudo ufw enable`. Be careful as you can get locked out of your sever if you don't perform these in this order. Now disable the root account by editing the config file at `/etc/ssh/sshd_config`. Go to `PermitRootLogin` and substitute `yes` with `no`. Finally restart the SSH service: `sudo service SSH restart`.

## Connection Persistence

The SSH connection by itself is not going to be sufficient for our purposes. When we use SSH to connect to our VPS, the remote kernel creates PTY (Pseudo-TeletYpe) as our terminal interface, and any process we run is attached to it. The problem is that something like installing a non-artifact Mozilla Firefox is a process that can take several hours, and it's very common for the SSH connection to drop at some point on such a timeframe due to network hiccup. When this happens the VPS' kernel kills every process attached to the defunct PTY, including our installation.

TMUX can keep the installation process alive though. It is like a terminal that runs as a server process that's detached from the SSH session. This means you can keep the installation running in the background as you please, and if the SSH connection drops you'll just need to hook back into your TMUX session, the same way you would if you had exited deliberately.

TMUX is usually included in the VPS by default. Here are some commands that I used often:
```bash
tmux new -s permconn          # create new session named "permconn"
tmux attach -t permconn       # reattach to session (or just: tmux a)
tmux detach                   # or Ctrl+b, d to detach from session (keeps it running)
tmux copy-mode                # or Ctrl+b, [ to enter scroll mode (q or Escape to exit)
```
## Headless Testing

The most gnarly part of testing in an environment like a VPS is that Firefox will need a lot of runtime dependencies that probably won't come pre-installed by default. Remember, we are running headless tests, i.e. we only have a terminal to interact with the virtual machine. 

For brevity, I'll share the command I used for the salad-package installment that would enable me run headless tests on the VPS:
```bash
sudo apt-get install -y xvfb \
  libgtk-3-0 libdbus-glib-1-2 libxt6 libpci3 \
  libasound2t64 libpulse0 libgl1 libglib2.0-0 libx11-xcb1 \
  libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 \
  libnss3 libcups2 libxss1 libxrandr2 libgbm1 libdrm2 \
  libatk1.0-0 libatk-bridge2.0-0 libcairo2 libpango-1.0-0
```

And here's the breakdown of what they mean:

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

Now to run the tests all I needed was to prepend the commands with `xvfb-run`, so for browser tests, for instance, I'd run: `xvfb-run ./mach test accessible/tests/browser/states/` and for mochitests: `xvfb-run ./mach test accessible/tests/mochitest/table/`.

## A Rudimentary CI/CD Workflow

The habit of building Firefox, running tests, editing the code, and then building and testing again created a nice little workflow that in many ways feels like an embryionic CI/CD. As per [official instructions](https://firefox-source-docs.mozilla.org/setup/linux_build.html), to build Firefox you run `./mach build`.
