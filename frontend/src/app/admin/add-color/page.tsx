"use client";

import { ChangeEvent, MouseEvent, useRef, useState } from "react";

type Point = {
    x: number;
    y: number;
};

const SAMPLE_SIZE = 7;

export default function AddColorPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [brand, setBrand] = useState("");
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const rgbToHex = (r: number, g: number, b: number) => {
        return (
            "#" +
            [r, g, b]
                .map((value) => value.toString(16).padStart(2, "0"))
                .join("")
        );
    };

    const getMedian = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        }

        return sorted[mid];
    };

    const getSampledColor = (
        ctx: CanvasRenderingContext2D,
        centerX: number,
        centerY: number,
        imageWidth: number,
        imageHeight: number,
        size: number = SAMPLE_SIZE
    ) => {
        const half = Math.floor(size / 2);

        const startX = Math.max(0, centerX - half);
        const startY = Math.max(0, centerY - half);
        const endX = Math.min(imageWidth - 1, centerX + half);
        const endY = Math.min(imageHeight - 1, centerY + half);

        const sampleWidth = endX - startX + 1;
        const sampleHeight = endY - startY + 1;

        const imageData = ctx.getImageData(startX, startY, sampleWidth, sampleHeight).data;

        const reds: number[] = [];
        const greens: number[] = [];
        const blues: number[] = [];

        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];

            if (a === 0) continue;

            const isTooBright = r > 235 && g > 235 && b > 235;
            if (isTooBright) continue;

            reds.push(r);
            greens.push(g);
            blues.push(b);
        }

        if (reds.length === 0) {
            for (let i = 0; i < imageData.length; i += 4) {
                reds.push(imageData[i]);
                greens.push(imageData[i + 1]);
                blues.push(imageData[i + 2]);
            }
        }

        return {
            r: getMedian(reds),
            g: getMedian(greens),
            b: getMedian(blues),
        };
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setSelectedPoint(null);
        setSelectedColor(null);
        setMessage("");
    };

    const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();

        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;

        setSelectedPoint({ x: displayX, y: displayY });
        setMessage("");

        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;

        const naturalX = Math.floor(displayX * scaleX);
        const naturalY = Math.floor(displayY * scaleY);

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        const { r, g, b } = getSampledColor(
            ctx,
            naturalX,
            naturalY,
            img.naturalWidth,
            img.naturalHeight,
            SAMPLE_SIZE
        );

        const hex = rgbToHex(r, g, b);
        setSelectedColor(hex);

        console.log("Clicked point:", { naturalX, naturalY });
        console.log("Sampled RGB:", { r, g, b });
        console.log("Sampled HEX:", hex);
    };

    const handleAddColor = async () => {
        if (!selectedColor) {
            alert("Please select a color first");
            return;
        }

        if (!brand.trim()) {
            alert("Please enter a brand");
            return;
        }

        if (!name.trim()) {
            alert("Please enter a color name");
            return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/add-color`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                brand,
                name,
                hex: selectedColor,
            }),
        });

        const data = await res.json();
        console.log(data);

        setMessage(data.message || "Color added");
        setBrand("");
        setName("");
        setSelectedPoint(null);
        setSelectedColor(null);
        setImageUrl(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50 px-4 py-8 md:py-12">
            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-[30px] border border-white/60 bg-white/90 shadow-2xl backdrop-blur">
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-600 px-6 py-8 text-white md:px-8 md:py-10">
                        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-pink-100">
                            Nail Color App
                        </p>
                        <h1 className="text-3xl font-bold md:text-4xl">Add Color</h1>
                        <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                            Upload an image, tap a color, then enter the brand and color name
                            to save it to your database.
                        </p>
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
                            <div className="mb-5">
                                <h2 className="text-xl font-semibold text-gray-800">
                                    Upload and Select Color
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Choose an image and click directly on the color you want to save.
                                    The app will sample a small area around your click for better
                                    accuracy.
                                </p>
                            </div>

                            <div className="mb-6">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    id="fileInput"
                                    className="hidden"
                                />

                                <label
                                    htmlFor="fileInput"
                                    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/60 px-6 py-8 text-center transition hover:border-pink-400 hover:bg-pink-50"
                                >
                                    <span className="text-base font-semibold text-gray-700">
                                        Upload Image
                                    </span>
                                    <span className="mt-2 text-sm text-gray-500">
                                        Tap to select from your device
                                    </span>
                                </label>
                            </div>

                            <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-inner">
                                <div className="flex min-h-[280px] items-center justify-center">
                                    {imageUrl ? (
                                        <div className="relative w-full">
                                            <img
                                                src={imageUrl}
                                                alt="Preview"
                                                onClick={handleImageClick}
                                                className="max-h-[420px] w-full cursor-crosshair object-contain select-none"
                                            />

                                            {selectedPoint && (
                                                <div
                                                    className="pointer-events-none absolute rounded-full border-2 border-white bg-pink-500/20 shadow-lg ring-2 ring-pink-300"
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        left: selectedPoint.x - 14,
                                                        top: selectedPoint.y - 14,
                                                    }}
                                                >
                                                    <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-pink-600" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="px-4 text-center text-gray-400">
                                            No image selected
                                        </p>
                                    )}
                                </div>
                            </div>

                            {selectedColor ? (
                                <div className="mb-5 flex items-center justify-between rounded-2xl border border-pink-100 bg-pink-50/60 p-4 shadow-sm">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">
                                            Selected Color
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-gray-800">
                                            {selectedColor}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Sample area: {SAMPLE_SIZE} × {SAMPLE_SIZE}
                                        </p>
                                    </div>

                                    <div
                                        className="h-14 w-14 rounded-xl border-2 border-white shadow"
                                        style={{ backgroundColor: selectedColor }}
                                    />
                                </div>
                            ) : (
                                <div className="mb-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-400">
                                    Selected color will appear here
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Brand
                                    </label>
                                    <input
                                        type="text"
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                        placeholder="Enter brand"
                                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Color Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter color name"
                                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                                    />
                                </div>

                                <button
                                    onClick={handleAddColor}
                                    className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] hover:from-pink-600 hover:to-rose-600 active:scale-[0.99]"
                                >
                                    Add Color
                                </button>

                                {message && (
                                    <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                                        {message}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}