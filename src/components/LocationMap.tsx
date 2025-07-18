'use client';

import styles from './LocationMap.module.css';

interface LocationMapProps {
  mapUrl: string;
  address: string;
  venueName: string;
  description?: string;
}

export default function LocationMap({ 
  mapUrl, 
  address, 
  venueName, 
  description 
}: LocationMapProps) {
  return (
    <section className={styles.container}>
      <h2 className={styles.title}>오시는 길</h2>
      <div className={styles.mapContainer}>
        <iframe
          className={styles.mapFrame}
          src={mapUrl}
          title="Wedding venue location"
          allowFullScreen
        />
      </div>
      <div className={styles.infoContainer}>
        <h3 className={styles.venueName}>{venueName}</h3>
        <p className={styles.address}>{address}</p>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </section>
  );
}
