import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateAuctionMutation } from '../../store/api/apiSlice'
import { useAppDispatch } from '../../store/hooks'
import { addToast } from '../../store/slices/uiSlice'
import './CreateAuction.css'

export const CreateAuction = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [createAuction, { isLoading }] = useCreateAuctionMutation()

  const [title, setTitle] = useState('')
  const [totalGifts, setTotalGifts] = useState('')
  const [rounds, setRounds] = useState(3)
  const [giftsPerRound, setGiftsPerRound] = useState<number[]>([1, 1, 1])
  const [roundDurations, setRoundDurations] = useState<number[]>([300, 300, 300])

  const handleRoundsChange = (newRounds: number) => {
    setRounds(newRounds)
    setGiftsPerRound(Array(newRounds).fill(1))
    setRoundDurations(Array(newRounds).fill(300))
  }

  const handleGiftChange = (index: number, value: string) => {
    const newGifts = [...giftsPerRound]
    newGifts[index] = parseInt(value) || 0
    setGiftsPerRound(newGifts)
  }

  const handleDurationChange = (index: number, value: string) => {
    const newDurations = [...roundDurations]
    newDurations[index] = parseInt(value) || 0
    setRoundDurations(newDurations)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const totalGiftsNum = parseInt(totalGifts)

    if (!title.trim()) {
      dispatch(addToast({ message: 'Please enter a title', type: 'error' }))
      return
    }

    if (!totalGiftsNum || totalGiftsNum <= 0) {
      dispatch(addToast({ message: 'Total gifts must be greater than 0', type: 'error' }))
      return
    }

    const sumGifts = giftsPerRound.reduce((a, b) => a + b, 0)
    if (sumGifts !== totalGiftsNum) {
      dispatch(addToast({
        message: `Sum of gifts per round (${sumGifts}) must equal total gifts (${totalGiftsNum})`,
        type: 'error'
      }))
      return
    }

    if (roundDurations.some(d => d <= 0)) {
      dispatch(addToast({ message: 'All round durations must be greater than 0', type: 'error' }))
      return
    }

    try {
      const result = await createAuction({
        title,
        totalGifts: totalGiftsNum,
        giftsPerRound,
        roundDurations
      }).unwrap()

      dispatch(addToast({ message: 'Auction created successfully', type: 'success' }))
      navigate(`/auctions/${result.id}`)
    } catch (error) {
      // Error handled by baseQuery
    }
  }

  return (
    <div className="create-auction-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h2>Create Auction</h2>
      </div>

      <form onSubmit={handleSubmit} className="auction-form">
        <div className="form-group">
          <label className="label">Title</label>
          <input
            type="text"
            className="input"
            placeholder="Enter auction title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Total Gifts</label>
          <input
            type="number"
            className="input"
            placeholder="Enter total number of gifts"
            value={totalGifts}
            onChange={(e) => setTotalGifts(e.target.value)}
            min="1"
          />
        </div>

        <div className="form-group">
          <label className="label">Number of Rounds</label>
          <input
            type="number"
            className="input"
            placeholder="Number of rounds"
            value={rounds}
            onChange={(e) => handleRoundsChange(parseInt(e.target.value) || 1)}
            min="1"
            max="10"
          />
        </div>

        <div className="rounds-section">
          <h3>Round Configuration</h3>
          {Array.from({ length: rounds }).map((_, index) => (
            <div key={index} className="round-config card">
              <h4>Round {index + 1}</h4>
              <div className="round-inputs">
                <div className="form-group">
                  <label className="label">Gifts</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Gifts"
                    value={giftsPerRound[index]}
                    onChange={(e) => handleGiftChange(index, e.target.value)}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Duration (seconds)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Duration"
                    value={roundDurations[index]}
                    onChange={(e) => handleDurationChange(index, e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Auction'}
          </button>
        </div>
      </form>
    </div>
  )
}
