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
        <p>체험을 위해 AI로 생성한 웨딩 사진입니다. 원하는 사진을 선택해 바꿔 보세요.</p>
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
