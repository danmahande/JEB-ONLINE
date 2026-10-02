"use client";

import Image from "next/image";
import { upload } from "@vercel/blob/client";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_SOURCE_SIZE = 10 * 1024 * 1024;
const MAX_OUTPUT_DIMENSION = 2048;

function cropToWebp(file: File, area: Area): Promise<Blob> {
  return createImageBitmap(file).then((bitmap) => {
    try {
      if (bitmap.width * bitmap.height > 24_000_000) {
        throw new Error("This image is too large to edit. Choose a smaller image.");
      }
      const scale = Math.min(
        1,
        MAX_OUTPUT_DIMENSION / Math.max(area.width, area.height)
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(area.width * scale));
      canvas.height = Math.max(1, Math.round(area.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this image.");
      context.drawImage(
        bitmap,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.type !== "image/webp") {
              reject(new Error("Your browser could not convert this image to WebP."));
              return;
            }
            resolve(blob);
          },
          "image/webp",
          0.9
        );
      });
    } finally {
      bitmap.close();
    }
  });
}

function canPreviewImage(value: string): boolean {
  if (value.startsWith("/products/")) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function ProductImageField({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => setCropArea(croppedAreaPixels),
    []
  );

  function selectFile(selected: File | undefined) {
    setError("");
    setCropArea(null);
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setFile(null);
      setPreviewUrl(null);
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (selected.size > MAX_SOURCE_SIZE) {
      setFile(null);
      setPreviewUrl(null);
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  async function uploadImage() {
    if (!file || !cropArea) {
      setError("Choose and position the crop before uploading.");
      return;
    }
    setUploading(true);
    onUploadingChange(true);
    setError("");
    try {
      const cropped = await cropToWebp(file, cropArea);
      if (cropped.size > 4.5 * 1024 * 1024) {
        throw new Error("The cropped image is too large to upload. Zoom in and try again.");
      }
      const imageId = crypto.randomUUID();
      const result = await upload(
        `product-images/${imageId}.webp`,
        new File([cropped], `${imageId}.webp`, { type: "image/webp" }),
        {
          access: "public",
          contentType: "image/webp",
          handleUploadUrl: "/api/admin/product-images",
        }
      );
      onChange(result.url);
      setFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed. Please try again.";
      setError(
        message.toLowerCase().includes("client token")
          ? "Image upload could not start. Connect a Vercel Blob store and try again."
          : message
      );
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-ink" htmlFor="product-image">
        Product image
      </label>
      <Input
        autoComplete="off"
        disabled={uploading}
        id="product-image"
        maxLength={240}
        onChange={(event) => onChange(event.target.value)}
        placeholder="/products/maize-flour.png"
        type="text"
        value={value}
      />
      <p className="text-xs leading-5 text-hush">
        Choose an image to crop and upload, or enter an existing image path.
      </p>
      {canPreviewImage(value) ? (
        <div className="relative aspect-square w-40 overflow-hidden rounded-md border border-line bg-background">
          <Image
            alt="Current product image preview"
            className="object-contain"
            fill
            sizes="160px"
            src={value}
            unoptimized
          />
        </div>
      ) : null}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-ink" htmlFor="product-image-file">
          Choose image to crop
        </label>
        <Input
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          id="product-image-file"
          onChange={(event) => selectFile(event.target.files?.[0])}
          ref={fileInput}
          type="file"
        />
      </div>
      {previewUrl ? (
        <>
          <div className="relative h-72 overflow-hidden rounded-md bg-ink">
            <Cropper
              aspect={1}
              crop={crop}
              image={previewUrl}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              zoom={zoom}
            />
          </div>
          <label className="block space-y-2 text-sm text-ink" htmlFor="product-image-zoom">
            Zoom
            <input
              className="block w-full accent-brand"
              id="product-image-zoom"
              max="3"
              min="1"
              onChange={(event) => setZoom(Number(event.target.value))}
              step="0.1"
              type="range"
              value={zoom}
            />
          </label>
          <Button
            disabled={uploading || !cropArea}
            onClick={() => void uploadImage()}
            type="button"
          >
            {uploading ? "Uploading image..." : "Crop and upload"}
          </Button>
        </>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
