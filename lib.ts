import { Course, MediaFile, MascotPose } from './types';
import JSZip from 'jszip';

const DB_NAME = 'CourseMakerDB';
const DB_VERSION = 1;
const STORE_NAME = 'courses';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const db = {
  saveCourse: async (course: Course): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Clone to remove File objects which can't be stored in IndexedDB
    const courseToStore = JSON.parse(JSON.stringify(course, (key, value) => {
      if (key === 'file') return undefined;
      return value;
    }));
    store.put(courseToStore);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  getCourse: async (id: string): Promise<Course | undefined> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
};

// Helper to resize mascot images to 1500x1500px PNG
const resizeImageToSquare = async (blobOrFile: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blobOrFile);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1500;
            canvas.height = 1500;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Clear canvas to ensure transparency
            ctx.clearRect(0, 0, 1500, 1500);
            
            // Draw image stretched to 1500x1500px as requested
            ctx.drawImage(img, 0, 0, 1500, 1500);
            
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas conversion failed'));
                }
            }, 'image/png');
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image load failed'));
        };

        img.src = url;
    });
};

export const zipManager = {
  zipCourse: async (course: Course, moduleIdsToInclude?: string[]): Promise<Blob> => {
    const zip = new JSZip();
    
    // Create a shallow copy for manipulation
    const courseToSave = { ...course };

    // Filter modules if moduleIdsToInclude is provided
    courseToSave.modules = moduleIdsToInclude 
        ? courseToSave.modules.filter(m => moduleIdsToInclude.includes(m.id))
        : courseToSave.modules;
    
    // Logic to rename mascot files based on mascot name and pose
    const mascotName = course.settings.mascotName?.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'mascot';
    
    // Update mascot paths in the course object to match the export naming convention
    // Force extension to .png as we will convert it
    courseToSave.mascot = courseToSave.mascot.map(pose => {
        const newPath = `mascot/${mascotName}_${pose.type}.png`;
        return { ...pose, path: newPath };
    });

    // Remove transient properties (blobUrl, file objects) before saving to JSON
    const cleanMedia = courseToSave.media.map(({file, blobUrl, ...rest}) => rest);
    const cleanMascot = courseToSave.mascot.map(({file, blobUrl, ...rest}) => rest);
    
    const cleanCourse = { ...courseToSave, media: cleanMedia, mascot: cleanMascot };
    
    zip.file('curso.json', JSON.stringify(cleanCourse, null, 2));

    // Add Media Files
    for (const item of courseToSave.media) {
        if (item.file) {
            zip.file(item.path, item.file);
        } else {
            try {
                const response = await fetch(item.blobUrl);
                const blob = await response.blob();
                zip.file(item.path, blob);
            } catch (e) {
                console.warn(`Could not fetch blob for ${item.path}`, e);
            }
        }
    }

    // Add Mascot Files using the updated paths in courseToSave.mascot
    for (const item of courseToSave.mascot) {
         // Logic to fetch the content (either from .file or .blobUrl)
         let content: Blob | File | undefined = item.file;
         if (!content) {
             try {
                 const response = await fetch(item.blobUrl);
                 content = await response.blob();
             } catch (e) {
                 console.warn(`Could not fetch blob for mascot ${item.path}`, e);
             }
         }
         
         if (content) {
             try {
                // RESIZE AND FORCE PNG
                const resizedBlob = await resizeImageToSquare(content);
                zip.file(item.path, resizedBlob);
             } catch (e) {
                 console.error(`Failed to resize mascot ${item.type}`, e);
                 // Fallback to original if resize fails, though strict PNG rule implies we should probably fail or warn
                 zip.file(item.path, content);
             }
         }
    }

    return zip.generateAsync({ type: 'blob' });
  },

  unzipCourse: async (zipFile: File): Promise<Course> => {
    const zip = await JSZip.loadAsync(zipFile);
    const courseFile = zip.file('curso.json');
    if (!courseFile) throw new Error('curso.json not found in zip');
    
    const courseContent = await courseFile.async('string');
    const course: Course = JSON.parse(courseContent);

    const mediaPromises = course.media.map(async (mediaItem) => {
      const file = zip.file(mediaItem.path);
      if (file) {
        const blob = await file.async('blob');
        mediaItem.blobUrl = URL.createObjectURL(blob);
      }
      return mediaItem;
    });
    
    const mascotPromises = course.mascot.map(async (mascotItem) => {
      const file = zip.file(mascotItem.path);
      if (file) {
        const blob = await file.async('blob');
        mascotItem.blobUrl = URL.createObjectURL(blob);
      }
      return mascotItem;
    });

    course.media = await Promise.all(mediaPromises);
    course.mascot = await Promise.all(mascotPromises);
    
    return course;
  },
};