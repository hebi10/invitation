import { DEMO_EXPERIENCE_IMAGE_OPTIONS } from '@/config/demoExperienceSeeds';

import styles from './DemoExperienceImagePicker.module.css';

export default function DemoExperienceImagePicker({
  selectedImage,
  onSelect,
}: {
  selectedImage: string;
  onSelect: (imageUrl: string) => void;
}) {
  return (
    <section className={styles.picker} aria-labelledby="demo-image-picker-title">
      <div>
        <h3 id="demo-image-picker-title">체험용 샘플 이미지</h3>
        <p>운영 저장소에 업로드하지 않고 아래 승인된 이미지 중 하나를 선택합니다.</p>
      </div>
      <div className={styles.options}>
        {DEMO_EXPERIENCE_IMAGE_OPTIONS.map((imageUrl, index) => (
          <button
            key={imageUrl}
            type="button"
            aria-pressed={selectedImage === imageUrl}
            onClick={() => onSelect(imageUrl)}
          >
            <img src={imageUrl} alt={`체험 샘플 ${index + 1}`} />
            <span>샘플 {index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
