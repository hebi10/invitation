import type { WeddingStoredContentModel } from './weddingStoredContentModel';
import contentStyles from './WeddingStoredContent.module.css';

type WeddingStoredContentProps = {
  className?: string;
  model: WeddingStoredContentModel;
  titleClassName?: string;
};

function buildPhoneHref(value: string) {
  const phone = value.replace(/[^\d+]/g, '');
  return phone ? `tel:${phone}` : '';
}

export function WeddingStoredContent({
  className,
  model,
  titleClassName,
}: WeddingStoredContentProps) {
  const hasContent = Boolean(
    model.reception ||
      model.venueGuide.length ||
      model.wreathGuide.length ||
      model.mapDescription ||
      model.ceremonyContact ||
      model.mapHref
  );
  const phoneHref = buildPhoneHref(model.ceremonyContact);

  if (!hasContent) {
    return null;
  }

  return (
    <section
      className={className}
      data-wedding-compatibility-section="stored-content"
      aria-labelledby="wedding-stored-content-title"
    >
      <h2 id="wedding-stored-content-title" className={titleClassName}>
        예식 추가 안내
      </h2>
      <div className={contentStyles.content}>
        {model.reception ? (
          <div className={contentStyles.group}>
            <h3>피로연</h3>
            <dl className={contentStyles.facts}>
              {model.reception.time ? (
                <div>
                  <dt>시간</dt>
                  <dd>{model.reception.time}</dd>
                </div>
              ) : null}
              {model.reception.location ? (
                <div>
                  <dt>장소</dt>
                  <dd>{model.reception.location}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        {model.venueGuide.length > 0 ? (
          <div className={contentStyles.group}>
            <h3>교통 · 방문 안내</h3>
            <ul className={contentStyles.guides}>
              {model.venueGuide.map((guide, index) => (
                <li key={`${guide.title}-${index}`}>
                  {guide.title ? <strong>{guide.title}</strong> : null}
                  {guide.content ? <span>{guide.content}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {model.wreathGuide.length > 0 ? (
          <div className={contentStyles.group}>
            <h3>화환 안내</h3>
            <ul className={contentStyles.guides}>
              {model.wreathGuide.map((guide, index) => (
                <li key={`${guide.title}-${index}`}>
                  {guide.title ? <strong>{guide.title}</strong> : null}
                  {guide.content ? <span>{guide.content}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {model.mapDescription ? (
          <div className={contentStyles.group}>
            <h3>오시는 길 안내</h3>
            <p className={contentStyles.description}>{model.mapDescription}</p>
          </div>
        ) : null}

        {model.ceremonyContact || model.mapHref ? (
          <div className={contentStyles.group}>
            <h3>위치와 문의</h3>
            {model.ceremonyContact ? <p>{model.ceremonyContact}</p> : null}
            <div className={contentStyles.actions}>
              {phoneHref ? (
                <a
                  className={contentStyles.action}
                  href={phoneHref}
                  aria-label="예식장에 전화하기"
                >
                  전화 문의
                </a>
              ) : null}
              {model.mapHref ? (
                <a
                  className={contentStyles.action}
                  href={model.mapHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  지도에서 위치 확인
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
