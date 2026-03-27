"use client";

import { useEffect, useState } from "react";

type ColorItem = {
    id: number;
    brand: string;
    name: string;
    hex: string;
    r: number;
    g: number;
    b: number;
};

export default function ShowColorsPage() {
    const [colors, setColors] = useState<ColorItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchColors = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/colors`);
            const data = await res.json();
            setColors(data);
        } catch (error) {
            console.error("Failed to fetch colors:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchColors();
    }, []);

    const handleDelete = async (id: number) => {
        const confirmed = window.confirm("Are you sure you want to delete this color?");
        if (!confirmed) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/colors/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await res.json();
            console.log(data);

            setColors((prev) => prev.filter((color) => color.id !== id));
        } catch (error) {
            console.error("Failed to delete color:", error);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-8 md:py-12">
            <div className="mx-auto max-w-6xl">
                <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-6 py-8 text-white md:px-8 md:py-10">
                        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                            Nail Color App
                        </p>
                        <h1 className="text-3xl font-bold md:text-4xl">
                            Show Colors
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                            View all colors currently saved in your database and manage them easily.
                        </p>
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Color Database
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Review your saved nail colors below.
                                </p>
                            </div>

                            {!loading && (
                                <div className="inline-flex w-fit items-center rounded-full bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-600">
                                    {colors.length} color{colors.length !== 1 ? "s" : ""}
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                                <p className="text-base font-medium text-gray-500">Loading...</p>
                            </div>
                        ) : colors.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center shadow-sm">
                                <p className="text-base font-medium text-gray-500">
                                    No colors found.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                    ID
                                                </th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                    Brand
                                                </th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                    Color Name
                                                </th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                    Hex
                                                </th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                    Preview
                                                </th>
                                                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-700">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {colors.map((color) => (
                                                <tr
                                                    key={color.id}
                                                    className="border-b border-gray-100 transition hover:bg-pink-50/40 last:border-b-0"
                                                >
                                                    <td className="px-5 py-4 text-sm font-medium text-gray-700">
                                                        {color.id}
                                                    </td>

                                                    <td className="px-5 py-4 text-sm text-gray-800">
                                                        {color.brand}
                                                    </td>

                                                    <td className="px-5 py-4 text-sm text-gray-800">
                                                        {color.name}
                                                    </td>

                                                    <td className="px-5 py-4 text-sm font-medium text-gray-600">
                                                        {color.hex}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="h-11 w-11 rounded-xl border border-gray-200 shadow-sm"
                                                                style={{ backgroundColor: color.hex }}
                                                            />
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <button
                                                            onClick={() => handleDelete(color.id)}
                                                            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 hover:shadow-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}