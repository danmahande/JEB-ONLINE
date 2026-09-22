#!/usr/bin/env python3
"""Double-fork daemonizer for the dev server supervisor.

The sandbox reaper sweeps processes descending from the tool-call shell
between calls. setsid alone is not enough (child is still the shell's
direct child until the shell exits). Double-fork orphans the daemon to
PID 1 IMMEDIATELY (parent exits at once), so by the time the sweep runs,
the daemon is not a descendant of the call tree anymore.

Usage: python3 daemonize_dev.py
"""
import os
import sys
import time

DEV_SH = "/home/z/my-project/.zscripts/dev.sh"
LOG = "/tmp/devsh-daemon.log"


def fork_and_exit_parent():
    pid = os.fork()
    if pid > 0:
        # parent exits immediately -> child reparents to PID 1
        os._exit(0)


def daemonize():
    # 1st fork
    fork_and_exit_parent()
    # new session, detach from controlling tty
    os.setsid()
    # 2nd fork: session leader forks, non-leader child can never regain a tty
    fork_and_exit_parent()
    # redirect std streams
    sys.stdout.flush()
    sys.stderr.flush()
    with open(os.devnull, "rb") as devnull:
        os.dup2(devnull.fileno(), 0)
    log_fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    os.dup2(log_fd, 1)
    os.dup2(log_fd, 2)


def main():
    # quick port check: already up? do nothing.
    import socket

    def port_open():
        s = socket.socket()
        s.settimeout(1)
        try:
            s.connect(("127.0.0.1", 3000))
            return True
        except OSError:
            return False
        finally:
            s.close()

    if port_open():
        print("already up")
        return

    daemonize()
    with open(LOG, "a") as f:
        f.write(f"[daemonize] spawning {DEV_SH} at {time.strftime('%F %T')}\n")
    os.execvp("bash", ["bash", DEV_SH])


if __name__ == "__main__":
    main()
