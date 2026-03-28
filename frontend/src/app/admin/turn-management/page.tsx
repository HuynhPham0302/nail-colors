"use client";

import { useEffect, useMemo, useState } from "react";

type Technician = {
    id: number;
    username: string;
    checkedIn: boolean;
    checkInOrder: number | null;
    inProgress: boolean;
    startedAt: number | null;
    appointmentMode: boolean;
    turnPoints: number; // regular = +2, appointment = +1
};

const initialTechnicians: Technician[] = [
    { id: 1, username: "staff1", checkedIn: false, checkInOrder: null, inProgress: false, startedAt: null, appointmentMode: false, turnPoints: 0 },
    { id: 2, username: "staff2", checkedIn: false, checkInOrder: null, inProgress: false, startedAt: null, appointmentMode: false, turnPoints: 0 },
    { id: 3, username: "staff3", checkedIn: false, checkInOrder: null, inProgress: false, startedAt: null, appointmentMode: false, turnPoints: 0 },
    { id: 4, username: "staff4", checkedIn: false, checkInOrder: null, inProgress: false, startedAt: null, appointmentMode: false, turnPoints: 0 },
    { id: 5, username: "staff5", checkedIn: false, checkInOrder: null, inProgress: false, startedAt: null, appointmentMode: false, turnPoints: 0 },
    { id: 6, username: "staff6", checkedIn: false, checkInOrder: null, inProgress: false, startedAt: null, appointmentMode: false, turnPoints: 0 },
];

function formatTurn(points: number) {
    const value = points / 2;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatElapsed(startedAt: number | null, now: number) {
    if (!startedAt) return "00:00";

    const diffSeconds = Math.floor((now - startedAt) / 1000);
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TurnManagementPage() {
    const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [fixMode, setFixMode] = useState(false);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const todayLabel = useMemo(() => {
        return new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }, []);

    const nextCheckInOrder = useMemo(() => {
        const maxOrder = technicians.reduce((max, tech) => {
            if (tech.checkInOrder === null) return max;
            return Math.max(max, tech.checkInOrder);
        }, 0);

        return maxOrder + 1;
    }, [technicians]);

    const availableStaff = technicians.filter((tech) => !tech.checkedIn && !tech.inProgress);

    const checkedInStaff = [...technicians]
        .filter((tech) => tech.checkedIn && !tech.inProgress)
        .sort((a, b) => {
            const aPriority = Math.floor(a.turnPoints / 2);
            const bPriority = Math.floor(b.turnPoints / 2);

            if (aPriority !== bPriority) return aPriority - bPriority;

            return (a.checkInOrder ?? 9999) - (b.checkInOrder ?? 9999);
        });

    const inProgressStaff = [...technicians]
        .filter((tech) => tech.inProgress)
        .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));

    const handleCheckIn = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: true,
                        checkInOrder: nextCheckInOrder,
                    }
                    : tech
            )
        );
    };

    const handleStartService = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: true,
                        inProgress: true,
                        startedAt: Date.now(),
                    }
                    : tech
            )
        );
    };

    const handleToggleAppointment = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        appointmentMode: !tech.appointmentMode,
                    }
                    : tech
            )
        );
    };

    const handleDoneService = (id: number) => {
        if (sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) => {
                if (tech.id !== id) return tech;

                const addedPoints = tech.appointmentMode ? 1 : 2;

                return {
                    ...tech,
                    checkedIn: true,
                    inProgress: false,
                    startedAt: null,
                    appointmentMode: false,
                    turnPoints: tech.turnPoints + addedPoints,
                };
            })
        );
    };

    const handleAdjustTurnPoints = (id: number, delta: number) => {
        if (!fixMode || sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) => {
                if (tech.id !== id) return tech;

                const nextPoints = Math.max(0, tech.turnPoints + delta);

                return {
                    ...tech,
                    turnPoints: nextPoints,
                };
            })
        );
    };

    const handleMoveCheckInOrder = (id: number, direction: "up" | "down") => {
        if (!fixMode || sessionEnded) return;

        const checkedInOnly = [...technicians]
            .filter((tech) => tech.checkedIn && !tech.inProgress)
            .sort((a, b) => (a.checkInOrder ?? 9999) - (b.checkInOrder ?? 9999));

        const index = checkedInOnly.findIndex((tech) => tech.id === id);
        if (index === -1) return;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= checkedInOnly.length) return;

        const currentTech = checkedInOnly[index];
        const targetTech = checkedInOnly[targetIndex];

        const currentOrder = currentTech.checkInOrder;
        const targetOrder = targetTech.checkInOrder;

        setTechnicians((prev) =>
            prev.map((tech) => {
                if (tech.id === currentTech.id) {
                    return { ...tech, checkInOrder: targetOrder };
                }
                if (tech.id === targetTech.id) {
                    return { ...tech, checkInOrder: currentOrder };
                }
                return tech;
            })
        );
    };

    const handleRemoveCheckIn = (id: number) => {
        if (!fixMode || sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: false,
                        checkInOrder: null,
                        inProgress: false,
                        startedAt: null,
                        appointmentMode: false,
                    }
                    : tech
            )
        );
    };

    const handleCancelInProgress = (id: number) => {
        if (!fixMode || sessionEnded) return;

        setTechnicians((prev) =>
            prev.map((tech) =>
                tech.id === id
                    ? {
                        ...tech,
                        checkedIn: true,
                        inProgress: false,
                        startedAt: null,
                        appointmentMode: false,
                    }
                    : tech
            )
        );
    };

    const handleDoneForToday = () => {
        const confirmed = window.confirm(
            "Are you sure you want to finish today and save all turn data?"
        );
        if (!confirmed) return;

        setSessionEnded(true);

        console.log("Final turn data for today:", technicians);
        alert("Today is finished. Later this button will save all data to the database.");
    };

    const handleResetBoard = () => {
        const confirmed = window.confirm("Reset the board for a new day?");
        if (!confirmed) return;

        setTechnicians((prev) =>
            prev.map((tech) => ({
                ...tech,
                checkedIn: false,
                checkInOrder: null,
                inProgress: false,
                startedAt: null,
                appointmentMode: false,
                turnPoints: 0,
            }))
        );

        setSessionEnded(false);
        setFixMode(false);
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-6 md:py-10">
            <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-6 py-8 text-white md:px-8 md:py-10">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                                    Nail Color App
                                </p>
                                <h1 className="text-3xl font-bold md:text-4xl">
                                    Turn Management
                                </h1>
                                <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
                                    Manage daily technician check-in, service progress, and turn counting.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <button
                                    onClick={() => setFixMode((prev) => !prev)}
                                    disabled={sessionEnded}
                                    className={`rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${fixMode
                                            ? "bg-amber-200 text-amber-900 hover:bg-amber-300"
                                            : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                                        }`}
                                >
                                    Fix Mode: {fixMode ? "On" : "Off"}
                                </button>

                                <button
                                    onClick={handleResetBoard}
                                    className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                                >
                                    Reset Board
                                </button>

                                <button
                                    onClick={handleDoneForToday}
                                    className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-md transition hover:bg-slate-100"
                                >
                                    Done for Today
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <div className="rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                                {todayLabel}
                            </div>

                            <div
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${sessionEnded
                                        ? "bg-amber-200 text-amber-900"
                                        : "bg-green-200 text-green-900"
                                    }`}
                            >
                                {sessionEnded ? "Session Ended" : "Session Active"}
                            </div>

                            {fixMode && !sessionEnded && (
                                <div className="rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold text-amber-900">
                                    Fix Mode Active
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6 p-4 md:grid-cols-3 md:p-8">
                        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">All Staff</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Available staff accounts for today.
                                    </p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    {availableStaff.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {availableStaff.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                        No available staff left to check in.
                                    </div>
                                ) : (
                                    availableStaff.map((tech) => (
                                        <div
                                            key={tech.id}
                                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-base font-semibold text-gray-800">
                                                        {tech.username}
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        Turn: {formatTurn(tech.turnPoints)}
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => handleCheckIn(tech.id)}
                                                    disabled={sessionEnded}
                                                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Check In
                                                </button>
                                            </div>

                                            {fixMode && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleAdjustTurnPoints(tech.id, -1)}
                                                        disabled={sessionEnded}
                                                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        -0.5
                                                    </button>

                                                    <button
                                                        onClick={() => handleAdjustTurnPoints(tech.id, 1)}
                                                        disabled={sessionEnded}
                                                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        +0.5
                                                    </button>

                                                    <button
                                                        onClick={() => handleAdjustTurnPoints(tech.id, 2)}
                                                        disabled={sessionEnded}
                                                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        +1
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Checked In</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Sorted by turn priority, then check-in order.
                                    </p>
                                </div>
                                <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                                    {checkedInStaff.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {checkedInStaff.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                        No technician checked in yet.
                                    </div>
                                ) : (
                                    checkedInStaff.map((tech) => (
                                        <div
                                            key={tech.id}
                                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-base font-semibold text-gray-800">
                                                            {tech.username}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Turn: {formatTurn(tech.turnPoints)}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            Priority: {Math.floor(tech.turnPoints / 2)} | Check-in order:{" "}
                                                            {tech.checkInOrder}
                                                        </p>
                                                    </div>

                                                    {tech.appointmentMode && (
                                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                                            Appointment
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleStartService(tech.id)}
                                                        disabled={sessionEnded}
                                                        className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Start Service
                                                    </button>

                                                    <button
                                                        onClick={() => handleToggleAppointment(tech.id)}
                                                        disabled={sessionEnded}
                                                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tech.appointmentMode
                                                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                                                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        Has Appointment
                                                    </button>
                                                </div>

                                                {fixMode && (
                                                    <div className="flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-3">
                                                        <button
                                                            onClick={() => handleMoveCheckInOrder(tech.id, "up")}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Move Up
                                                        </button>

                                                        <button
                                                            onClick={() => handleMoveCheckInOrder(tech.id, "down")}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Move Down
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, -1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            -0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 2)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +1
                                                        </button>

                                                        <button
                                                            onClick={() => handleRemoveCheckIn(tech.id)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Remove Check In
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 md:p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">In Progress</h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Technicians currently serving customers.
                                    </p>
                                </div>
                                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                    {inProgressStaff.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {inProgressStaff.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                        No technician is in progress right now.
                                    </div>
                                ) : (
                                    inProgressStaff.map((tech) => (
                                        <div
                                            key={tech.id}
                                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-base font-semibold text-gray-800">
                                                            {tech.username}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Time: {formatElapsed(tech.startedAt, now)}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Current Turn: {formatTurn(tech.turnPoints)}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            After done:{" "}
                                                            {formatTurn(tech.turnPoints + (tech.appointmentMode ? 1 : 2))}
                                                        </p>
                                                    </div>

                                                    {tech.appointmentMode && (
                                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                                            Appointment
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleToggleAppointment(tech.id)}
                                                        disabled={sessionEnded}
                                                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tech.appointmentMode
                                                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                                                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        Has Appointment
                                                    </button>

                                                    <button
                                                        onClick={() => handleDoneService(tech.id)}
                                                        disabled={sessionEnded}
                                                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Done
                                                    </button>
                                                </div>

                                                {fixMode && (
                                                    <div className="flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-3">
                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, -1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            -0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 1)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +0.5
                                                        </button>

                                                        <button
                                                            onClick={() => handleAdjustTurnPoints(tech.id, 2)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            +1
                                                        </button>

                                                        <button
                                                            onClick={() => handleCancelInProgress(tech.id)}
                                                            disabled={sessionEnded}
                                                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            Cancel Service
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}