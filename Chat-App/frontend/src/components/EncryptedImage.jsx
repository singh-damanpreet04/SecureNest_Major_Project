import { useEffect, useState } from 'react';
import { axiosInstance } from '../lib/axios';

export default function EncryptedImage({ messageId, encryption }) {
	const [objectUrl, setObjectUrl] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		let revoked = false;
		let url = null;
		async function run() {
			try {
				setError(null);
				const { key, iv, authTag, mimeType } = encryption || {};
				if (!key || !iv || !authTag || !mimeType) throw new Error('Missing encryption metadata');
				// Always use relative path so axiosInstance baseURL (/api) is respected
				const path = encryption.downloadUrl?.startsWith('/') ? encryption.downloadUrl : `/${encryption.downloadUrl || ''}`;
				const resp = await axiosInstance.get(path, { responseType: 'arraybuffer' });
				const combined = new Uint8Array(resp.data); // ciphertext with tag appended
				const keyBytes = Uint8Array.from(atob(key), c => c.charCodeAt(0));
				const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

				const cryptoKey = await crypto.subtle.importKey(
					'raw',
					keyBytes,
					{ name: 'AES-GCM' },
					false,
					['decrypt']
				);
				const decrypted = await crypto.subtle.decrypt(
					{ name: 'AES-GCM', iv: ivBytes },
					cryptoKey,
					combined
				);
				const blob = new Blob([decrypted], { type: mimeType });
				url = URL.createObjectURL(blob);
				if (!revoked) setObjectUrl(url);
			} catch (e) {
				console.error('EncryptedImage error:', e);
				if (!revoked) setError(e.message || 'Failed to decrypt image');
			}
		}
		run();
		return () => {
			revoked = true;
			if (url) URL.revokeObjectURL(url);
		};
	}, [messageId, encryption]);

	if (error) {
		return (
			<div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
				Failed to load image
			</div>
		);
	}

	if (!objectUrl) {
		return (
			<div className="w-40 h-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
		);
	}

	return (
		<img src={objectUrl} alt="Sent" className="max-h-64 w-auto rounded-lg" />
	);
}


