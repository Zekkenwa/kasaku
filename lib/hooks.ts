import { useState, useEffect } from 'react';

export function useOtpCountdown(initialSeconds: number = 180) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && seconds > 0) {
            interval = setInterval(() => {
                setSeconds((prev) => prev - 1);
            }, 1000);
        } else if (seconds === 0) {
            setIsActive(false);
        }

        return () => clearInterval(interval);
    }, [isActive, seconds]);

    const startCountdown = () => {
        setSeconds(initialSeconds);
        setIsActive(true);
    };

    const resetCountdown = () => {
        setSeconds(initialSeconds);
        setIsActive(true);
    }

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
    };

    return {
        seconds,
        isActive,
        startCountdown,
        resetCountdown,
        formatTime,
    };
}
